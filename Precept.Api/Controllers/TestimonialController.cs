using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Precept.Api.Data;
using Precept.Api.Models;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestimonialController : ControllerBase
    {
        private readonly PreceptDbContext _context;
        private readonly ICurrentUser _currentUser;

        public TestimonialController(PreceptDbContext context, ICurrentUser currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        // GET: api/testimonial/public
        // Unauthenticated access for the landing page
        [AllowAnonymous]
        [HttpGet("public")]
        public async Task<IActionResult> GetPublicTestimonials()
        {
            var testimonials = await _context.Testimonials
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
            if (string.IsNullOrEmpty(_currentUser.UserId))
                return Unauthorized();

            var testimonial = new Testimonial
            {
                UserId = _currentUser.UserId,
                Name = dto.Name,
                Handle = dto.Handle,
                Text = dto.Text,
                AvatarSrc = dto.AvatarSrc,
                IsApproved = true // Auto-approved as requested
            };

            _context.Testimonials.Add(testimonial);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPublicTestimonials), new { id = testimonial.Id }, testimonial);
        }
    }

    public class TestimonialDto
    {
        public string Name { get; set; } = string.Empty;
        public string Handle { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string? AvatarSrc { get; set; }
    }
}
