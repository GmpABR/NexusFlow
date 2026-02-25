using Backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Require user to be logged in
public class SystemController : ControllerBase
{
    private readonly AppDbContext _context;

    public SystemController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("er-diagram")]
    public IActionResult GenerateErDiagram()
    {
        var sb = new StringBuilder();
        sb.AppendLine("@startuml");
        sb.AppendLine("hide circle");
        sb.AppendLine("skinparam linetype ortho");
        sb.AppendLine("skinparam class {");
        sb.AppendLine("  BackgroundColor White");
        sb.AppendLine("  ArrowColor #2c3e50");
        sb.AppendLine("  BorderColor #2c3e50");
        sb.AppendLine("}");
        sb.AppendLine();

        var model = _context.Model;

        // Entities
        foreach (var entityType in model.GetEntityTypes())
        {
            if (entityType.IsOwned()) continue;

            var tableName = entityType.GetTableName() ?? entityType.GetDefaultTableName() ?? entityType.Name;
            sb.AppendLine($"entity \"{tableName}\" as {tableName} {{");

            foreach (var property in entityType.GetProperties())
            {
                var isPk = property.IsPrimaryKey() ? "*" : "";
                var isFk = property.IsForeignKey() ? "<<FK>>" : "";
                var type = property.ClrType.Name;
                if (property.ClrType.IsGenericType && property.ClrType.GetGenericTypeDefinition() == typeof(Nullable<>))
                {
                    type = Nullable.GetUnderlyingType(property.ClrType)?.Name + "?";
                }

                sb.AppendLine($"  {isPk}{property.Name} : {type} {isFk}");
            }

            sb.AppendLine("}");
        }

        sb.AppendLine();

        // Relationships
        foreach (var entityType in model.GetEntityTypes())
        {
            var sourceTable = entityType.GetTableName() ?? entityType.GetDefaultTableName() ?? entityType.Name;
            
            foreach (var foreignKey in entityType.GetForeignKeys())
            {
                var targetType = foreignKey.PrincipalEntityType;
                var targetTable = targetType.GetTableName() ?? targetType.GetDefaultTableName() ?? targetType.Name;

                var isMany = !foreignKey.IsUnique;
                var isRequired = foreignKey.IsRequired;

                var sourceMultiplicity = isMany ? "}o" : (isRequired ? "||" : "|o");
                var targetMultiplicity = "||"; // Generally 1 side for EF Core standard foreign keys

                // PlantUML relation direction: Target ||--o{ Source
                sb.AppendLine($"{targetTable} {targetMultiplicity}..{sourceMultiplicity} {sourceTable}");
            }
        }

        sb.AppendLine("@enduml");

        return Ok(new { plantUml = sb.ToString() });
    }
}
