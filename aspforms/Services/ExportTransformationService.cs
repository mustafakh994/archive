using FormsManagementApi.DTOs;
using System.Text.Json;

namespace FormsManagementApi.Services
{
    public class ExportTransformationService : IExportTransformationService
    {
        public object TransformFieldValue(string fieldType, object? value, FormFieldDefinitionDto? fieldDef = null)
        {
            if (value == null)
                return string.Empty;

            return fieldType.ToLower() switch
            {
                "checkbox" => TransformCheckboxValue(Convert.ToBoolean(value)),
                "date" => TransformDateValue(Convert.ToDateTime(value)),
                "dropdown" or "radio" => TransformDropdownValue(value, fieldDef),
                "file" => TransformFileValue(value.ToString()),
                "location" => TransformLocationValue(value),
                "signature" => TransformSignatureValue(value.ToString()),
                "textarea" or "longtext" => TransformLongTextValue(value.ToString()),
                _ => value.ToString() ?? string.Empty
            };
        }

        public string TransformCheckboxValue(bool value)
        {
            return value ? "نعم" : "لا";
        }

        public string TransformDateValue(DateTime value)
        {
            return value.ToString("yyyy-MM-dd");
        }

        public string TransformDropdownValue(object? value, FormFieldDefinitionDto? fieldDef)
        {
            if (value == null)
                return string.Empty;

            var valueStr = value.ToString();
            
            // If no field definition or options available, return original value
            if (fieldDef?.Options == null || !fieldDef.Options.Any())
                return valueStr ?? string.Empty;

            // Find matching option by value
            var matchingOption = fieldDef.Options.FirstOrDefault(opt => 
                opt.Value.Equals(valueStr, StringComparison.OrdinalIgnoreCase));

            // Return label if found, otherwise return original value
            return matchingOption?.Label ?? valueStr ?? string.Empty;
        }

        public string TransformFileValue(string? url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return string.Empty;

            // If it's already a complete URL, return as-is
            if (url.StartsWith("http://") || url.StartsWith("https://"))
                return url;

            // If it's a relative path, it should be handled by the calling service
            // to construct the complete URL based on the application's base URL
            return url;
        }

        public string TransformLocationValue(object? coordinates)
        {
            if (coordinates == null)
                return string.Empty;

            try
            {
                // Handle different possible coordinate formats
                if (coordinates is string coordStr)
                {
                    // Try to parse as JSON object
                    var coordObj = JsonSerializer.Deserialize<Dictionary<string, object>>(coordStr);
                    if (coordObj != null && coordObj.ContainsKey("lat") && coordObj.ContainsKey("lng"))
                    {
                        var lat = coordObj["lat"].ToString();
                        var lng = coordObj["lng"].ToString();
                        return $"{lat}, {lng}";
                    }
                    
                    // If it's already formatted, return as-is
                    return coordStr;
                }

                // Handle direct object with lat/lng properties
                var coordType = coordinates.GetType();
                var latProp = coordType.GetProperty("lat") ?? coordType.GetProperty("latitude");
                var lngProp = coordType.GetProperty("lng") ?? coordType.GetProperty("longitude");

                if (latProp != null && lngProp != null)
                {
                    var lat = latProp.GetValue(coordinates);
                    var lng = lngProp.GetValue(coordinates);
                    return $"{lat}, {lng}";
                }

                // Handle JsonElement case (when parsed from JSON)
                if (coordinates is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Object)
                {
                    if (jsonElement.TryGetProperty("lat", out var latElement) && 
                        jsonElement.TryGetProperty("lng", out var lngElement))
                    {
                        return $"{latElement}, {lngElement}";
                    }
                    
                    if (jsonElement.TryGetProperty("latitude", out var latitudeElement) && 
                        jsonElement.TryGetProperty("longitude", out var longitudeElement))
                    {
                        return $"{latitudeElement}, {longitudeElement}";
                    }
                }

                // Fallback to string representation
                return coordinates.ToString() ?? string.Empty;
            }
            catch (Exception)
            {
                // If parsing fails, return string representation or empty
                return coordinates.ToString() ?? string.Empty;
            }
        }

        public string TransformSignatureValue(string? base64Data)
        {
            if (string.IsNullOrWhiteSpace(base64Data))
                return string.Empty;

            // Check if it's a data URL (base64 signature)
            if (base64Data.StartsWith("data:image/") && base64Data.Contains("base64,"))
                return "Signature submitted";

            // Check if it's just base64 data
            if (IsBase64String(base64Data))
                return "Signature submitted";

            // If it's already a readable format or URL, return as-is
            return base64Data;
        }

        public string TransformLongTextValue(string? text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return string.Empty;

            // Replace newlines with spaces for Excel compatibility
            return text.Replace("\r\n", " ")
                      .Replace("\n", " ")
                      .Replace("\r", " ")
                      .Trim();
        }

        /// <summary>
        /// Helper method to check if a string is valid base64
        /// </summary>
        private static bool IsBase64String(string base64)
        {
            if (string.IsNullOrWhiteSpace(base64))
                return false;

            try
            {
                // Remove data URL prefix if present
                var cleanBase64 = base64;
                if (base64.Contains("base64,"))
                {
                    cleanBase64 = base64.Substring(base64.IndexOf("base64,") + 7);
                }

                // Check if it's valid base64
                Convert.FromBase64String(cleanBase64);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}