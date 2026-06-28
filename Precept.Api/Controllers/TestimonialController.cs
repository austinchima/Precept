using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("general")]
    public class TestimonialController(PreceptDbContext context, ICurrentUser currentUser) : ControllerBase
    {
        /// <summary>
        /// Gets 10 auto-approved testimonials for the landing page.
        /// </summary>
        [AllowAnonymous]
        [HttpGet("public")]
        public async Task<IActionResult> GetPublicTestimonials()
        {
            var testimonials = await context.Testimonials
                .Where(t => t.IsApproved)
                .OrderByDescending(t => t.DateSubmitted)
                .Take(10)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Handle,
                    t.Text,
                    t.AvatarSrc,
                    t.DateSubmitted
                })
                .ToListAsync();

            return Ok(testimonials);
        }

        // POST: api/testimonial
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> SubmitTestimonial([FromBody] TestimonialDto dto)
        {
            if (string.IsNullOrEmpty(currentUser.UserId))
                return Unauthorized();

            var testimonial = new Testimonial
            {
                UserId = currentUser.UserId,
                Name = dto.Name,
                Handle = dto.Handle,
                Text = dto.Text,
                AvatarSrc = dto.AvatarSrc,
                IsApproved = true // Auto-approved as requested
            };

            context.Testimonials.Add(testimonial);
            await context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPublicTestimonials), new { id = testimonial.Id }, testimonial);
        }
    }

    public class TestimonialDto
    {
        [Required, StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required, StringLength(50)]
        public string Handle { get; set; } = string.Empty;

        [Required, StringLength(2000)]
        public string Text { get; set; } = string.Empty;

        [StringLength(500)]
        public string? AvatarSrc { get; set; }
    }
}
