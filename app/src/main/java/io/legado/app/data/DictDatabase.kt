package io.legado.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import io.legado.app.data.dao.DictDao
import io.legado.app.data.entities.DictEntry
import splitties.init.appCtx

/**
 * Separate database for translation dictionaries
 * Keeps dictionary data isolated from main app database for better performance
 */
@Database(
    version = 2, // Bumped for composite primary key change
    exportSchema = true,
    entities = [DictEntry::class]
)
abstract class DictDatabase : RoomDatabase() {

    abstract val dictDao: DictDao

    companion object {
        const val DATABASE_NAME = "dict.db"

        @Volatile
        private var instance: DictDatabase? = null

        fun getInstance(context: Context = appCtx): DictDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    DictDatabase::class.java,
                    DATABASE_NAME
                )
                .fallbackToDestructiveMigration(dropAllTables = true)
                .allowMainThreadQueries() // Allow for fast dict lookups
                .build()
                .also { instance = it }
            }
        }

        /**
         * Get DAO for dictionary operations
         */
        fun getDao(): DictDao = getInstance().dictDao

        /**
         * Close database connection
         */
        fun close() {
            instance?.close()
            instance = null
        }
    }
}
