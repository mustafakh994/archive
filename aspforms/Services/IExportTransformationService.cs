using FormsManagementApi.DTOs;

namespace FormsManagementApi.Services
{
    public interface IExportTransformationService
    {
        /// <summary>
        /// Transforms a field value based on its type for export compatibility
        /// </summary>
        /// <param name="fieldType">The type of the form field</param>
        /// <param name="value">The raw field value</param>
        /// <param name="fieldDef">Field definition containing options and metadata</param>
        /// <returns>Transformed value suitable for export</returns>
        object TransformFieldValue(string fieldType, object? value, FormFieldDefinitionDto? fieldDef = null);

        /// <summary>
        /// Converts boolean checkbox values to Arabic Yes/No
        /// </summary>
        /// <param name="value">Boolean value to transform</param>
        /// <returns>Arabic "نعم" for true, "لا" for false</returns>
        string TransformCheckboxValue(bool value);

        /// <summary>
        /// Formats date values to ISO string format
        /// </summary>
        /// <param name="value">DateTime value to format</param>
        /// <returns>ISO formatted date string</returns>
        string TransformDateValue(DateTime value);

        /// <summary>
        /// Maps dropdown/radio option IDs to their display labels
        /// </summary>
        /// <param name="value">Selected option value/ID</param>
        /// <param name="fieldDef">Field definition containing option mappings</param>
        /// <returns>Option label or original value if mapping not found</returns>
        string TransformDropdownValue(object? value, FormFieldDefinitionDto? fieldDef);

        /// <summary>
        /// Handles file upload field values for export
        /// </summary>
        /// <param name="url">File URL or path</param>
        /// <returns>Complete file URL or appropriate display text</returns>
        string TransformFileValue(string? url);

        /// <summary>
        /// Formats location coordinates for readable display
        /// </summary>
        /// <param name="coordinates">Location data object</param>
        /// <returns>Formatted coordinate string</returns>
        string TransformLocationValue(object? coordinates);

        /// <summary>
        /// Handles signature field data for export
        /// </summary>
        /// <param name="base64Data">Base64 signature data</param>
        /// <returns>Readable signature indicator text</returns>
        string TransformSignatureValue(string? base64Data);

        /// <summary>
        /// Removes newlines from long text for Excel compatibility
        /// </summary>
        /// <param name="text">Text content with potential newlines</param>
        /// <returns>Text with newlines replaced by spaces</returns>
        string TransformLongTextValue(string? text);
    }
}