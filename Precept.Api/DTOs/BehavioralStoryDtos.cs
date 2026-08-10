using System.ComponentModel.DataAnnotations;
using Precept.Api.Models;

namespace Precept.Api.DTOs
{
    public class BehavioralStoryResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Situation { get; set; } = string.Empty;
        public string Task { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Result { get; set; } = string.Empty;
        public string Tags { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ConfidenceLevel ConfidenceLevel { get; set; }
        public DateTime? LastReviewedAt { get; set; }
        public DateTime? NextReviewAt { get; set; }
    }

    public class CreateBehavioralStoryRequest
    {
        [Required(ErrorMessage = "Title is required")]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Situation is required")]
        public string Situation { get; set; } = string.Empty;

        [Required(ErrorMessage = "Task is required")]
        public string Task { get; set; } = string.Empty;

        [Required(ErrorMessage = "Action is required")]
        public string Action { get; set; } = string.Empty;

        [Required(ErrorMessage = "Result is required")]
        public string Result { get; set; } = string.Empty;

        public string Tags { get; set; } = string.Empty;
    }

    public class UpdateBehavioralStoryRequest
    {
        [Required(ErrorMessage = "Title is required")]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Situation is required")]
        public string Situation { get; set; } = string.Empty;

        [Required(ErrorMessage = "Task is required")]
        public string Task { get; set; } = string.Empty;

        [Required(ErrorMessage = "Action is required")]
        public string Action { get; set; } = string.Empty;

        [Required(ErrorMessage = "Result is required")]
        public string Result { get; set; } = string.Empty;

        public string Tags { get; set; } = string.Empty;
    }
}
