using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevTrack.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Phase2_TaskEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssigneeId",
                table: "Tasks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Tasks",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "DueDate",
                table: "Tasks",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Priority",
                table: "Tasks",
                type: "int",
                nullable: false,
                defaultValue: 1); // Default to Medium

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Tasks",
                type: "int",
                nullable: false,
                defaultValue: 1); // Default to Todo

            // Migrate data
            migrationBuilder.Sql("UPDATE Tasks SET Status = 4 WHERE IsCompleted = 1"); // Done
            migrationBuilder.Sql("UPDATE Tasks SET Status = 1 WHERE IsCompleted = 0"); // Todo

            migrationBuilder.DropColumn(
                name: "IsCompleted",
                table: "Tasks");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_AssigneeId",
                table: "Tasks",
                column: "AssigneeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_OrganizationMembers_AssigneeId",
                table: "Tasks",
                column: "AssigneeId",
                principalTable: "OrganizationMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCompleted",
                table: "Tasks",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            // Reverse migration
            migrationBuilder.Sql("UPDATE Tasks SET IsCompleted = 1 WHERE Status = 4"); // Done
            migrationBuilder.Sql("UPDATE Tasks SET IsCompleted = 0 WHERE Status != 4"); // Not Done

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_OrganizationMembers_AssigneeId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_AssigneeId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "AssigneeId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "DueDate",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Tasks");
        }
    }
}
