using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using AutoMapper;
using FormsManagementApi.Data;
using FormsManagementApi.DTOs;
using FormsManagementApi.Models;
using FormsManagementApi.Services;
using FormsManagementApi.Configuration;
using System.Text.Json;

namespace FormsManagementApi.Services;

/// <summary>
/// Unit tests for export pagination functionality.
/// Tests pagination parameters, validation, and metadata generation.
/// </summary>
public class ExportPaginationTests
{
    /// <summary>
    /// Tests pagination metadata calculation.
    /// </summary>
    public void TestPaginationMetadataCalculation()
    {
        // Test scenario: 25 total records, 10 per page
        var metadata1 = ExportPaginationMetadataDto.Create(1, 10, 25);
        
        if (metadata1.CurrentPage != 1)
            throw new Exception($"Expected CurrentPage = 1, got {metadata1.CurrentPage}");
        
        if (metadata1.PageSize != 10)
            throw new Exception($"Expected PageSize = 10, got {metadata1.PageSize}");
        
        if (metadata1.TotalRecords != 25)
            throw new Exception($"Expected TotalRecords = 25, got {metadata1.TotalRecords}");
        
        if (metadata1.TotalPages != 3)
            throw new Exception($"Expected TotalPages = 3, got {metadata1.TotalPages}");
        
        if (!metadata1.HasNextPage)
            throw new Exception("Expected HasNextPage = true for page 1");
        
        if (metadata1.HasPreviousPage)
            throw new Exception("Expected HasPreviousPage = false for page 1");

        // Test middle page
        var metadata2 = ExportPaginationMetadataDto.Create(2, 10, 25);
        
        if (!metadata2.HasNextPage)
            throw new Exception("Expected HasNextPage = true for page 2");
        
        if (!metadata2.HasPreviousPage)
            throw new Exception("Expected HasPreviousPage = true for page 2");

        // Test last page
        var metadata3 = ExportPaginationMetadataDto.Create(3, 10, 25);
        
        if (metadata3.HasNextPage)
            throw new Exception("Expected HasNextPage = false for last page");
        
        if (!metadata3.HasPreviousPage)
            throw new Exception("Expected HasPreviousPage = true for last page");

        // Test edge case: exactly divisible
        var metadata4 = ExportPaginationMetadataDto.Create(1, 10, 20);
        if (metadata4.TotalPages != 2)
            throw new Exception($"Expected TotalPages = 2 for 20 records with 10 per page, got {metadata4.TotalPages}");

        // Test edge case: single record
        var metadata5 = ExportPaginationMetadataDto.Create(1, 10, 1);
        if (metadata5.TotalPages != 1)
            throw new Exception($"Expected TotalPages = 1 for 1 record, got {metadata5.TotalPages}");
        
        if (metadata5.HasNextPage)
            throw new Exception("Expected HasNextPage = false for single page");

        Console.WriteLine("✓ Pagination metadata calculation tests passed");
    }

    /// <summary>
    /// Tests Skip and Take calculations.
    /// </summary>
    public void TestSkipTakeCalculations()
    {
        // Test page 1, size 10: Skip = 0, Take = 10
        var filter1 = new ExportFilterDto { Page = 1, PageSize = 10 };
        if (filter1.Skip != 0 || filter1.Take != 10)
        {
            throw new Exception($"Page 1, Size 10: Expected Skip=0, Take=10, got Skip={filter1.Skip}, Take={filter1.Take}");
        }

        // Test page 3, size 25: Skip = 50, Take = 25
        var filter2 = new ExportFilterDto { Page = 3, PageSize = 25 };
        if (filter2.Skip != 50 || filter2.Take != 25)
        {
            throw new Exception($"Page 3, Size 25: Expected Skip=50, Take=25, got Skip={filter2.Skip}, Take={filter2.Take}");
        }

        // Test page 5, size 100: Skip = 400, Take = 100
        var filter3 = new ExportFilterDto { Page = 5, PageSize = 100 };
        if (filter3.Skip != 400 || filter3.Take != 100)
        {
            throw new Exception($"Page 5, Size 100: Expected Skip=400, Take=100, got Skip={filter3.Skip}, Take={filter3.Take}");
        }

        Console.WriteLine("✓ Skip/Take calculation tests passed");
    }

    /// <summary>
    /// Runs all pagination tests.
    /// </summary>
    public static void RunAllTests()
    {
        var tests = new ExportPaginationTests();
        
        try
        {
            tests.TestSkipTakeCalculations();
            tests.TestPaginationMetadataCalculation();
            
            Console.WriteLine("\n🎉 All export pagination tests passed successfully!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n❌ Test failed: {ex.Message}");
            throw;
        }
    }
}