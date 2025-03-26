using System;
using System.Text.Json;
using System.Text.Json.Serialization;

public class JsonConverter : JsonConverter<long>
{
    public override long Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // Try to read the value as a long, and if it’s in string format, parse it.
        if (reader.TokenType == JsonTokenType.String && long.TryParse(reader.GetString(), out var value))
        {
            return value;
        }
        return reader.GetInt64(); // Read as long directly
    }

    public override void Write(Utf8JsonWriter writer, long value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString()); // Serialize as a string
    }
}
