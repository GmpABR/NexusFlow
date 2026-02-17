using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddScrumFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssigneeId",
                table: "TaskCards",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DueDate",
                table: "TaskCards",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "TaskCards",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "StoryPoints",
                table: "TaskCards",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tags",
                table: "TaskCards",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskCards_AssigneeId",
                table: "TaskCards",
                column: "AssigneeId");

            migrationBuilder.AddForeignKey(
                name: "FK_TaskCards_Users_AssigneeId",
                table: "TaskCards",
                column: "AssigneeId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TaskCards_Users_AssigneeId",
                table: "TaskCards");

            migrationBuilder.DropIndex(
                name: "IX_TaskCards_AssigneeId",
                table: "TaskCards");

            migrationBuilder.DropColumn(
                name: "AssigneeId",
                table: "TaskCards");

            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "TaskCards");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "TaskCards");

            migrationBuilder.DropColumn(
                name: "StoryPoints",
                table: "TaskCards");

            migrationBuilder.DropColumn(
                name: "Tags",
                table: "TaskCards");
        }
    }
}
