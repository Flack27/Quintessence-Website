using System.Text.Json;

namespace QuintessenceWebsiteDAL.Store
{
    /// <summary>
    /// A tiny file-backed store for a JSON list. Reads/writes an atomic snapshot of a
    /// <c>List&lt;T&gt;</c> under App_Data. Thread-safe via a per-file lock. This replaces
    /// the SQL Server database - the site's data (games, timeline, roster) is small and
    /// static enough that a JSON file plus disk-stored images is all it needs.
    /// </summary>
    public class JsonStore<T>
    {
        private readonly string _path;
        private readonly object _lock = new();
        private readonly Func<List<T>> _seed;

        private static readonly JsonSerializerOptions _options = new()
        {
            WriteIndented = true,
            PropertyNameCaseInsensitive = true
        };

        /// <param name="path">Absolute path to the JSON file.</param>
        /// <param name="seed">Initial contents written when the file doesn't exist yet.</param>
        public JsonStore(string path, Func<List<T>>? seed = null)
        {
            _path = path;
            _seed = seed ?? (() => new List<T>());
        }

        public List<T> Read()
        {
            lock (_lock)
            {
                return ReadUnlocked();
            }
        }

        /// <summary>Mutates the list under the lock and persists the result.</summary>
        public void Update(Action<List<T>> mutate)
        {
            lock (_lock)
            {
                var list = ReadUnlocked();
                mutate(list);
                WriteUnlocked(list);
            }
        }

        /// <summary>Mutates the list under the lock, persists, and returns a value.</summary>
        public TResult Update<TResult>(Func<List<T>, TResult> mutate)
        {
            lock (_lock)
            {
                var list = ReadUnlocked();
                var result = mutate(list);
                WriteUnlocked(list);
                return result;
            }
        }

        private List<T> ReadUnlocked()
        {
            if (!File.Exists(_path))
            {
                var seeded = _seed();
                WriteUnlocked(seeded);
                return seeded;
            }

            try
            {
                var json = File.ReadAllText(_path);
                return JsonSerializer.Deserialize<List<T>>(json, _options) ?? new List<T>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"JsonStore read ({_path}): {ex.Message}");
                return new List<T>();
            }
        }

        private void WriteUnlocked(List<T> list)
        {
            var dir = Path.GetDirectoryName(_path);
            if (!string.IsNullOrEmpty(dir))
                Directory.CreateDirectory(dir);

            // Write to a temp file then move, so a crash mid-write can't corrupt the store.
            var tmp = _path + ".tmp";
            File.WriteAllText(tmp, JsonSerializer.Serialize(list, _options));
            File.Move(tmp, _path, overwrite: true);
        }
    }
}
