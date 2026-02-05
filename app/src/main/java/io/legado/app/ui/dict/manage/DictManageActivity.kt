package io.legado.app.ui.dict.manage

import android.os.Bundle
import android.view.View
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import io.legado.app.R
import io.legado.app.base.BaseActivity
import io.legado.app.databinding.ActivityDictManageBinding
import io.legado.app.databinding.ItemDictManageBinding
import io.legado.app.model.DictionaryImportState
import io.legado.app.model.TranslationLoader
import io.legado.app.utils.DictManager
import io.legado.app.utils.TranslateUtils
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

class DictManageActivity : BaseActivity<ActivityDictManageBinding>() {

    override val binding by lazy { ActivityDictManageBinding.inflate(layoutInflater) }
    
    // Helper to hold binding and type
    private data class DictItem(
        val binding: ItemDictManageBinding,
        val type: DictManager.DictType,
        val titleRes: Int
    )

    private lateinit var items: List<DictItem>
    private var currentImportType: DictManager.DictType? = null

    private val importDictLauncher = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            currentImportType?.let { type ->
                startImport(type, it)
            }
        }
    }

    override fun onActivityCreated(savedInstanceState: Bundle?) {
        binding.titleBar.title = getString(R.string.custom_dict_manage)
        
        items = listOf(
            DictItem(binding.itemNames, DictManager.DictType.NAMES, R.string.import_names),
            DictItem(binding.itemVietphrase, DictManager.DictType.VIETPHRASE, R.string.import_vietphrase),
            DictItem(binding.itemPhienam, DictManager.DictType.PHIENAM, R.string.import_phienam)
        )

        items.forEach { item ->
            item.binding.tvTitle.text = getString(item.titleRes)
            item.binding.btnImport.setOnClickListener {
                currentImportType = item.type
                importDictLauncher.launch("text/plain")
            }
            item.binding.btnReset.setOnClickListener {
                showResetConfirmationDialog(item.type)
            }
        }

        refreshUI()
        observeImportState()
    }

    private fun observeImportState() {
        lifecycleScope.launch {
            DictManager.importState.collect { state ->
                updateUIForState(state)
            }
        }
    }

    private fun startImport(type: DictManager.DictType, uri: android.net.Uri) {
        currentImportType = type
        
        // Add warning for large files
        checkFileSize(uri) { isLarge, size ->
            if (isLarge) {
                showLargeFileWarning(size) {
                    // User confirmed, proceed with import
                    DictManager.importDict(this, uri, type)
                }
            } else {
                // Normal file size, proceed directly
                DictManager.importDict(this, uri, type)
            }
        }
    }

    private fun checkFileSize(uri: android.net.Uri, callback: (Boolean, Long) -> Unit) {
        try {
            val cursor = contentResolver.query(uri, null, null, null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val sizeIndex = it.getColumnIndex(android.provider.OpenableColumns.SIZE)
                    val fileSize = it.getLong(sizeIndex)
                    val isLarge = fileSize > 10 * 1024 * 1024 // 10MB threshold
                    callback(isLarge, fileSize)
                } else {
                    callback(false, 0)
                }
            }
        } catch (e: Exception) {
            callback(false, 0)
        }
    }

    private fun showLargeFileWarning(sizeMB: Long, onProceed: () -> Unit) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Cảnh Báo: File Lớn")
            .setMessage("File bạn chọn có kích thước ${sizeMB / (1024 * 1024)}MB.\n\nXử lý file lớn có thể mất vài giây và ứng dụng có thể tạm thời không phản hồi.\n\nBạn có muốn tiếp tục nhập không?")
            .setPositiveButton("Tiếp tục") { _, _ ->
                onProceed()
            }
            .setNegativeButton("Hủy", null)
            .show()
    }

    private fun updateUIForState(state: DictionaryImportState) {
        when (state) {
            is DictionaryImportState.Idle -> {
                refreshUI()
            }
            
            is DictionaryImportState.Loading -> {
                updateImportingCard(currentImportType?.fileName ?: "", true)
            }
            
            is DictionaryImportState.Success -> {
                updateImportingCard(currentImportType?.fileName ?: "", false)
                refreshUI()
                currentImportType?.let { showSuccessMessage(it) }
            }
            
            is DictionaryImportState.Error -> {
                updateImportingCard(currentImportType?.fileName ?: "", false)
                refreshUI()
                showErrorMessage(state.message)
            }
        }
    }

    private fun updateImportingCard(fileName: String, isImporting: Boolean) {
        items.forEach { item ->
            if (item.type.fileName == fileName) {
                // Disable/enable import button during import
                item.binding.btnImport.isEnabled = !isImporting
                
                // Show/hide loading indicator on card
                if (isImporting) {
                    item.binding.btnImport.alpha = 0.5f
                    item.binding.tvStatus.text = "Đang nhập ..."
                    item.binding.tvStatus.setTextColor(android.graphics.Color.parseColor("#FF9800"))
                    item.binding.btnReset.visibility = View.GONE // Hide reset while importing
                } else {
                    item.binding.btnImport.alpha = 1.0f
                }
            } else {
                // Other cards remain normal
                item.binding.btnImport.isEnabled = !isImporting
                item.binding.btnImport.alpha = if (isImporting) 0.5f else 1.0f
                item.binding.btnReset.isEnabled = !isImporting
            }
        }
    }

    private fun showSuccessAnimation(type: DictManager.DictType) {
        val item = items.find { it.type == type } ?: return
        
        // Card elevation animation
        item.binding.root.animate()
            .scaleX(1.05f)
            .scaleY(1.05f)
            .setDuration(200)
            .withEndAction {
                item.binding.root.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(200)
                    .start()
            }
            .start()
        
        // Status text color animation
        item.binding.tvStatus.animate()
            .alpha(0f)
            .setDuration(150)
            .withEndAction {
                refreshUI()
                item.binding.tvStatus.animate()
                    .alpha(1f)
                    .setDuration(150)
                    .start()
            }
            .start()
    }

    private fun showSuccessMessage(type: DictManager.DictType) {
        val typeName = when (type) {
            DictManager.DictType.NAMES -> "Names"
            DictManager.DictType.VIETPHRASE -> "VietPhrase"  
            DictManager.DictType.PHIENAM -> "PhienAm"
        }
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Nhập Thành Công")
            .setMessage("Từ điển $typeName đã được nhập thành công!\n\nTừ điển đã sẵn sàng để sử dụng ngay lập tức cho dịch thuật.")
            .setIcon(android.R.drawable.ic_dialog_info)
            .setPositiveButton("OK") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    private fun showErrorMessage(message: String) {
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show()
    }

    private fun showResetConfirmationDialog(type: DictManager.DictType) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle(R.string.confirm)
            .setMessage(getString(R.string.sure_del))
            .setPositiveButton(getString(R.string.restore)) { _, _ ->
                if (DictManager.deleteCustomDict(type)) {
                    // Reload dictionary from asset
                    lifecycleScope.launch(Dispatchers.IO) {
                        TranslationLoader.reloadFromAsset(type)
                        TranslateUtils.clearCache()
                    }
                    refreshUI()
                    showResetAnimation(type)
                    showResetMessage(type)
                }
            }
            .setNegativeButton(getString(R.string.cancel), null)
            .show()
    }

    private fun showResetAnimation(type: DictManager.DictType) {
        val item = items.find { it.type == type } ?: return
        
        // Fade out reset button
        item.binding.btnReset.animate()
            .alpha(0f)
            .scaleX(0.8f)
            .scaleY(0.8f)
            .setDuration(200)
            .start()
    }

    private fun showResetMessage(type: DictManager.DictType) {
        val typeName = when (type) {
            DictManager.DictType.NAMES -> "Names"
            DictManager.DictType.VIETPHRASE -> "VietPhrase"  
            DictManager.DictType.PHIENAM -> "PhienAm"
        }
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Reset Thành Công")
            .setMessage("Từ điển $typeName đã được reset về mặc định.\n\nTừ điển mặc định đang được kích hoạt để dịch thuật.")
            .setIcon(android.R.drawable.ic_dialog_info)
            .setPositiveButton("OK") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    private fun refreshUI() {
        items.forEach { item ->
            val hasCustom = DictManager.hasCustomDict(item.type)
            if (hasCustom) {
                item.binding.tvStatus.text = "Đang dùng: Từ điển tùy chỉnh"
                item.binding.tvStatus.setTextColor(android.graphics.Color.parseColor("#43A047"))
                item.binding.btnReset.visibility = View.VISIBLE
                item.binding.btnReset.alpha = 1f
            } else {
                item.binding.tvStatus.text = "Đang dùng: Mặc định (tích hợp sẵn)"
                item.binding.tvStatus.setTextColor(android.graphics.Color.GRAY)
                item.binding.btnReset.visibility = View.GONE
            }
            
            // Ensure import button is in correct state
            item.binding.btnImport.isEnabled = true
            item.binding.btnImport.alpha = 1f
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Cancel any ongoing import
        DictManager.cancelImport()
    }
}