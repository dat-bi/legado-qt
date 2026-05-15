package io.legado.app.ui.book.read

import android.annotation.SuppressLint
import android.app.SearchManager
import android.content.Context
import android.content.Intent
import android.content.pm.ResolveInfo
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.Menu
import android.view.View
import android.view.ViewGroup
import android.widget.PopupWindow
import androidx.annotation.ColorInt
import androidx.annotation.RequiresApi
import androidx.appcompat.view.SupportMenuInflater
import androidx.appcompat.view.menu.MenuBuilder
import androidx.appcompat.view.menu.MenuItemImpl
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.DrawableCompat
import androidx.recyclerview.widget.LinearLayoutManager
import io.legado.app.R
import io.legado.app.base.adapter.ItemViewHolder
import io.legado.app.base.adapter.RecyclerAdapter
import io.legado.app.constant.AppLog
import io.legado.app.databinding.ItemTextBinding
import io.legado.app.databinding.PopupActionMenuBinding
import io.legado.app.help.config.ReadBookConfig
import io.legado.app.help.config.AppConfig
import io.legado.app.lib.theme.getPrimaryTextColor
import io.legado.app.utils.ColorUtils
import io.legado.app.utils.dpToPx
import io.legado.app.utils.isAbsUrl
import io.legado.app.utils.printOnDebug
import io.legado.app.utils.sendToClip
import io.legado.app.utils.share
import io.legado.app.utils.toastOnUi

@SuppressLint("RestrictedApi")
class TextActionMenu(private val context: Context, private val callBack: CallBack) :
    PopupWindow(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT) {

    private val binding = PopupActionMenuBinding.inflate(LayoutInflater.from(context))
    private val adapter = Adapter(context).apply {
        setHasStableIds(true)
    }
    private val menuItems: List<MenuItemImpl>
    private var menuTextColor: Int = ContextCompat.getColor(context, R.color.primaryText)

    init {
        @SuppressLint("InflateParams")
        contentView = binding.root

        isTouchable = true
        isOutsideTouchable = false
        isFocusable = false

        val myMenu = MenuBuilder(context)
        val otherMenu = MenuBuilder(context)
        SupportMenuInflater(context).inflate(R.menu.content_select_action, myMenu)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            onInitializeMenu(otherMenu)
        }
        menuItems = myMenu.visibleItems + otherMenu.visibleItems
        binding.recyclerView.layoutManager =
            LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
        binding.recyclerView.adapter = adapter
        upMenu()
    }

    fun upMenu() {
        adapter.setItems(menuItems)
    }

    fun show(
        view: View,
        windowHeight: Int,
        startX: Int,
        startTopY: Int,
        startBottomY: Int,
        endX: Int,
        endBottomY: Int
    ) {
        if (isShowing) {
            dismiss()
        }
        val screenPadding = 8.dpToPx()
        val rootWidth = view.rootView.width.takeIf { it > 0 } ?: view.width
        val maxPopupWidth = (rootWidth - screenPadding * 2).coerceAtLeast(56.dpToPx())
        binding.recyclerView.layoutParams = binding.recyclerView.layoutParams.apply {
            width = minOf(maxPopupWidth, menuItems.size * 56.dpToPx())
        }
        updateColors()
        contentView.measure(
            View.MeasureSpec.UNSPECIFIED,
            View.MeasureSpec.UNSPECIFIED,
        )
        val popupWidth = contentView.measuredWidth
        val popupHeight = contentView.measuredHeight
        val maxX = (rootWidth - popupWidth - screenPadding).coerceAtLeast(screenPadding)
        val maxY = (windowHeight - popupHeight - screenPadding).coerceAtLeast(screenPadding)

        val spaceAbove = startTopY - screenPadding
        val spaceBetween = endBottomY - startBottomY
        val spaceBelow = windowHeight - endBottomY - screenPadding
        val (anchorX, anchorY) = when {
            spaceAbove >= popupHeight || spaceAbove >= spaceBetween && spaceAbove >= spaceBelow ->
                startX to startTopY - popupHeight

            spaceBetween >= popupHeight || spaceBetween >= spaceBelow ->
                startX to startBottomY

            else -> endX to endBottomY
        }
        showAtLocation(
            view,
            Gravity.TOP or Gravity.START,
            anchorX.coerceIn(screenPadding, maxX),
            anchorY.coerceIn(screenPadding, maxY)
        )
    }

    private fun updateColors() {
        val readBg = ReadBookConfig.bgMeanColor.takeIf { Color.alpha(it) != 0 }
            ?: ContextCompat.getColor(context, R.color.background_card)
        val menuBg = if (ColorUtils.isColorLight(readBg)) {
            ColorUtils.shiftColor(readBg, 0.84f)
        } else {
            ColorUtils.shiftColor(readBg, 1.22f)
        }
        menuTextColor = context.getPrimaryTextColor(ColorUtils.isColorLight(menuBg))
        binding.root.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 8.dpToPx().toFloat()
            setColor(menuBg)
            setStroke(1, ColorUtils.adjustAlpha(menuTextColor, 0.12f))
        }
        adapter.notifyDataSetChanged()
    }

    inner class Adapter(context: Context) :
        RecyclerAdapter<MenuItemImpl, ItemTextBinding>(context) {

        override fun getItemId(position: Int): Long {
            return position.toLong()
        }

        override fun getViewBinding(parent: ViewGroup): ItemTextBinding {
            return ItemTextBinding.inflate(inflater, parent, false)
        }

        override fun convert(
            holder: ItemViewHolder,
            binding: ItemTextBinding,
            item: MenuItemImpl,
            payloads: MutableList<Any>
        ) {
            with(binding) {
                textView.text = item.displayTitle()
                textView.setTextColor(menuTextColor)
                iconView.setColorFilter(menuTextColor)
                val icon = item.iconResId()?.let { iconRes ->
                    ContextCompat.getDrawable(context, iconRes)?.mutate()?.let { drawable ->
                        DrawableCompat.setTint(drawable, menuTextColor)
                        drawable
                    }
                }
                iconView.setImageDrawable(icon)
                iconView.visibility = if (icon == null) View.INVISIBLE else View.VISIBLE
            }
        }

        override fun registerListener(holder: ItemViewHolder, binding: ItemTextBinding) {
            holder.itemView.setOnClickListener {
                getItem(holder.layoutPosition)?.let {
                    if (!callBack.onMenuItemSelected(it.itemId)) {
                        onMenuItemSelected(it)
                    }
                }
                callBack.onMenuActionFinally()
            }
            holder.itemView.setOnLongClickListener {
                if (AppConfig.contentSelectSpeakMod == 0) {
                    AppConfig.contentSelectSpeakMod = 1
                    context.toastOnUi("Chuyển sang chế độ đọc liên tục từ vị trí đã chọn")
                } else {
                    AppConfig.contentSelectSpeakMod = 0
                    context.toastOnUi("Chuyển sang chế độ chỉ đọc nội dung đã chọn")
                }
                true
            }
        }
    }

    private fun MenuItemImpl.iconResId(): Int? {
        return when (itemId) {
            R.id.menu_replace -> R.drawable.ic_edit
            R.id.menu_copy -> R.drawable.ic_copy
            R.id.menu_bookmark -> R.drawable.ic_bookmark
            R.id.menu_aloud -> R.drawable.ic_volume_up
            R.id.menu_dict -> R.drawable.ic_search_hint
            R.id.menu_search_content -> R.drawable.ic_search
            R.id.menu_browser -> R.drawable.ic_web_outline
            R.id.menu_share_str -> R.drawable.ic_share
            else -> R.drawable.ic_more
        }
    }

    private fun MenuItemImpl.displayTitle(): CharSequence {
        return when (itemId) {
            R.id.menu_aloud -> context.getString(R.string.reading)
            else -> title ?: ""
        }
    }

    private fun onMenuItemSelected(item: MenuItemImpl) {
        when (item.itemId) {
            R.id.menu_copy -> context.sendToClip(callBack.selectedText)
            R.id.menu_share_str -> context.share(callBack.selectedText)
            R.id.menu_browser -> {
                kotlin.runCatching {
                    val intent = if (callBack.selectedText.isAbsUrl()) {
                        Intent(Intent.ACTION_VIEW).apply {
                            data = Uri.parse(callBack.selectedText)
                        }
                    } else {
                        Intent(Intent.ACTION_WEB_SEARCH).apply {
                            putExtra(SearchManager.QUERY, callBack.selectedText)
                        }
                    }
                    context.startActivity(intent)
                }.onFailure {
                    it.printOnDebug()
                    context.toastOnUi(it.localizedMessage ?: "ERROR")
                }
            }

            else -> item.intent?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    kotlin.runCatching {
                        it.putExtra(Intent.EXTRA_PROCESS_TEXT, callBack.selectedText)
                        context.startActivity(it)
                    }.onFailure { e ->
                        AppLog.put("Lỗi khi thực hiện thao tác trình đơn văn bản\n$e", e, true)
                    }
                }
            }
        }
    }

    @RequiresApi(Build.VERSION_CODES.M)
    private fun createProcessTextIntent(): Intent {
        return Intent()
            .setAction(Intent.ACTION_PROCESS_TEXT)
            .setType("text/plain")
    }

    @RequiresApi(Build.VERSION_CODES.M)
    private fun getSupportedActivities(): List<ResolveInfo> {
        return context.packageManager
            .queryIntentActivities(createProcessTextIntent(), 0)
    }

    @RequiresApi(Build.VERSION_CODES.M)
    private fun createProcessTextIntentForResolveInfo(info: ResolveInfo): Intent {
        return createProcessTextIntent()
            .putExtra(Intent.EXTRA_PROCESS_TEXT_READONLY, false)
            .setClassName(info.activityInfo.packageName, info.activityInfo.name)
    }

    /**
     * Start with a menu Item order value that is high enough
     * so that your "PROCESS_TEXT" menu items appear after the
     * standard selection menu items like Cut, Copy, Paste.
     */
    @RequiresApi(Build.VERSION_CODES.M)
    private fun onInitializeMenu(menu: Menu) {
        kotlin.runCatching {
            var menuItemOrder = 100
            for (resolveInfo in getSupportedActivities()) {
                menu.add(
                    Menu.NONE, Menu.NONE,
                    menuItemOrder++, resolveInfo.loadLabel(context.packageManager)
                ).intent = createProcessTextIntentForResolveInfo(resolveInfo)
            }
        }.onFailure {
            context.toastOnUi("Lỗi khi lấy trình đơn thao tác văn bản: ${it.localizedMessage}")
        }
    }

    interface CallBack {
        val selectedText: String

        fun onMenuItemSelected(itemId: Int): Boolean

        fun onMenuActionFinally()
    }
}
