using FluentAssertions;
using Precept.Api.Services;

namespace Precept.Tests.Unit;

public class JobPostingContentExtractorTests
{
    private readonly JobPostingContentExtractor _extractor = new();

    [Fact]
    public void Extract_ParsesTitleAndCompany_FromOgTags()
    {
        const string html = """
            <html>
            <head>
                <meta property="og:title" content="Senior Backend Engineer at Acme Corp" />
                <meta property="og:description" content="Build scalable systems." />
            </head>
            <body>$150k - $200k. Remote.</body>
            </html>
            """;

        var result = _extractor.Extract("https://example.com/job", html);

        result.RoleTitle.Should().Be("Senior Backend Engineer");
        result.CompanyName.Should().Be("Acme Corp");
        result.Description.Should().Be("Build scalable systems.");
        result.SalaryRange.Should().Be("$150k - $200k");
        result.IsRemote.Should().BeTrue();
    }

    [Fact]
    public void Extract_FallsBackToTitleTag_WhenOpenGraphMissing()
    {
        const string html = """
            <html>
            <head><title>Frontend Developer - TechCo</title></head>
            <body>We are looking for a frontend developer in Austin, TX.</body>
            </html>
            """;

        var result = _extractor.Extract("https://example.com/job", html);

        result.RoleTitle.Should().Be("Frontend Developer");
        result.CompanyName.Should().Be("TechCo");
        result.Location.Should().Be("Austin, TX");
    }

    [Fact]
    public void Extract_DetectsRemote_FromBodyText()
    {
        const string html = """
            <html>
            <head><title>Data Scientist</title></head>
            <body>This is a fully remote position.</body>
            </html>
            """;

        var result = _extractor.Extract("https://example.com/job", html);

        result.IsRemote.Should().BeTrue();
    }

    [Fact]
    public void Extract_ReturnsEmpty_WhenHtmlIsMinimal()
    {
        const string html = "<html><body>Just some text.</body></html>";

        var result = _extractor.Extract("https://example.com/job", html);

        result.Should().NotBeNull();
        result.CompanyName.Should().BeEmpty();
        result.RoleTitle.Should().BeEmpty();
        result.Description.Should().Be("Just some text.");
    }

    [Fact]
    public void Extract_FallsBackToTitle_WhenHtmlIsEmpty()
    {
        var result = _extractor.Extract("https://example.com/job", string.Empty, "Product Designer at Studio Inc");

        result.Should().NotBeNull();
        result.RoleTitle.Should().Be("Product Designer");
        result.CompanyName.Should().Be("Studio Inc");
        result.Source.Should().Be("https://example.com/job");
    }

    [Fact]
    public void Extract_HandlesEmptyHtmlAndTitle()
    {
        var result = _extractor.Extract("https://example.com/job", string.Empty);

        result.Should().NotBeNull();
        result.RoleTitle.Should().BeEmpty();
        result.CompanyName.Should().BeEmpty();
        result.Source.Should().Be("https://example.com/job");
    }
}
