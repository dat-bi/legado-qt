package io.legado.app.model.dictionary

import java.io.*
import java.nio.charset.StandardCharsets
import java.util.*

object DictionaryCompiler {

    private class BuildNode {
        var value: String? = null
        val children = HashMap<Char, BuildNode>() // HashMap faster than TreeMap
    }

    /**
     * Compile a text dictionary file (Key=Value) to a binary dictionary file.
     * Optimized for speed with HashMap and ArrayDeque.
     */
    fun compile(srcFile: File, destFile: File) {
        val startTime = System.currentTimeMillis()
        val root = BuildNode()
        
        // 1. Build Trie in Memory
        android.util.Log.d("DictionaryCompiler", "Compiling ${srcFile.name}...")
        var lineCount = 0
        BufferedReader(InputStreamReader(FileInputStream(srcFile), StandardCharsets.UTF_8), 65536).use { reader ->
            var line: String?
            while (reader.readLine().also { line = it } != null) {
                lineCount++
                val l = line!!
                val eqIdx = l.indexOf('=')
                if (eqIdx > 0 && eqIdx < l.length - 1) {
                    val key = l.substring(0, eqIdx).trim()
                    val value = l.substring(eqIdx + 1).trim()
                    if (key.isNotEmpty() && value.isNotEmpty()) {
                        insert(root, key, value)
                    }
                }
            }
        }
        android.util.Log.d("DictionaryCompiler", "Trie built ($lineCount lines) in ${System.currentTimeMillis() - startTime}ms. Flattening...")

        // 2. Flatten structure
        val flattenStart = System.currentTimeMillis()
        val nodes = ArrayList<FlatNode>(lineCount * 3) // Pre-size
        val stringPool = ByteArrayOutputStream(lineCount * 20) // Pre-size
        val stringOffsetMap = HashMap<String, Int>(lineCount)

        // Add Root Node
        nodes.add(FlatNode(0.toChar())) 

        val queue = ArrayDeque<Pair<BuildNode, Int>>() // ArrayDeque faster than LinkedList
        queue.add(root to 0)

        // BFS traversal - children sorted for binary search
        while (queue.isNotEmpty()) {
            val (buildNode, flatIdx) = queue.poll()
            val flatNode = nodes[flatIdx]
            
            // Serialize Value
            buildNode.value?.let { v ->
                flatNode.valueOffset = stringOffsetMap.getOrPut(v) {
                    val offset = stringPool.size()
                    writeString(stringPool, v)
                    offset
                }
            }

            // Process Children (sorted for binary search)
            if (buildNode.children.isNotEmpty()) {
                flatNode.childrenCount = buildNode.children.size
                flatNode.childrenOffset = nodes.size
                
                val sortedChildren = buildNode.children.entries.sortedBy { it.key }
                for ((char, childNode) in sortedChildren) {
                    val childFlatIndex = nodes.size
                    nodes.add(FlatNode(char))
                    queue.add(childNode to childFlatIndex)
                }
            }
        }
        android.util.Log.d("DictionaryCompiler", "Flattened (${nodes.size} nodes) in ${System.currentTimeMillis() - flattenStart}ms")

        // 3. Write to File
        val writeStart = System.currentTimeMillis()
        BufferedOutputStream(FileOutputStream(destFile), 65536).use { out ->
            val buffer = ByteArray(4)
            
            fun writeInt(v: Int) {
                buffer[0] = (v and 0xFF).toByte()
                buffer[1] = ((v ushr 8) and 0xFF).toByte()
                buffer[2] = ((v ushr 16) and 0xFF).toByte()
                buffer[3] = ((v ushr 24) and 0xFF).toByte()
                out.write(buffer, 0, 4)
            }
            
            fun writeShort(v: Int) {
                buffer[0] = (v and 0xFF).toByte()
                buffer[1] = ((v ushr 8) and 0xFF).toByte()
                out.write(buffer, 0, 2)
            }
            
            // Header
            writeInt(BinaryDictionary.MAGIC)
            writeInt(BinaryDictionary.VERSION)
            writeInt(nodes.size)
            writeInt(stringPool.size())

            // Node Table
            for (node in nodes) {
                writeShort(node.char.code)
                writeShort(node.childrenCount)
                writeInt(node.childrenOffset)
                writeInt(node.valueOffset)
            }

            // String Pool
            stringPool.writeTo(out)
        }
        android.util.Log.d("DictionaryCompiler", "Written in ${System.currentTimeMillis() - writeStart}ms. TOTAL: ${System.currentTimeMillis() - startTime}ms")
    }

    private fun insert(root: BuildNode, key: String, value: String) {
        var node = root
        for (char in key) {
            node = node.children.getOrPut(char) { BuildNode() }
        }
        node.value = value
    }

    private fun writeString(pool: ByteArrayOutputStream, str: String) {
        val bytes = str.toByteArray(StandardCharsets.UTF_8)
        pool.write(bytes.size and 0xFF)
        pool.write((bytes.size ushr 8) and 0xFF)
        pool.write(bytes)
    }

    private class FlatNode(val char: Char) {
        var valueOffset: Int = -1
        var childrenCount: Int = 0
        var childrenOffset: Int = -1
    }
}
