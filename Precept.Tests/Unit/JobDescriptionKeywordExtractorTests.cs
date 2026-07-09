using FluentAssertions;
using Precept.Api.Services;

namespace Precept.Tests.Unit;

public class JobDescriptionKeywordExtractorTests
{
    private readonly JobDescriptionKeywordExtractor _extractor = new();

    [Fact]
    public void ExtractKeywords_EmptyDescription_ReturnsEmpty()
    {
        var result = _extractor.ExtractKeywords("");
        result.Should().BeEmpty();
    }

    [Fact]
    public void ExtractKeywords_FindsSingleWordKeywords()
    {
        var description = "We use React, TypeScript, Node.js and PostgreSQL.";
        var result = _extractor.ExtractKeywords(description);

        result.Should().Contain("React");
        result.Should().Contain("TypeScript");
        result.Should().Contain("Node.js");
        result.Should().Contain("PostgreSQL");
    }

    [Fact]
    public void ExtractKeywords_FindsMultiWordPhrases()
    {
        var description = "Experience with React Native, ASP.NET Core, and machine learning is required.";
        var result = _extractor.ExtractKeywords(description);

        result.Should().Contain("React Native");
        result.Should().Contain("ASP.NET Core");
        result.Should().Contain("Machine Learning");
    }

    [Fact]
    public void ExtractKeywords_IsCaseInsensitive()
    {
        var description = "Looking for AWS, graphql, and ci/cd skills.";
        var result = _extractor.ExtractKeywords(description);

        result.Should().Contain("AWS");
        result.Should().Contain("GraphQL");
        result.Should().Contain("CI/CD");
    }

    [Fact]
    public void ExtractKeywords_DoesNotMatchSubstrings()
    {
        // "Angular" should not match "AngularJS" substring, but "JavaScript" could match.
        var description = "We use AngularJS for legacy work.";
        var result = _extractor.ExtractKeywords(description);

        result.Should().NotContain("Angular");
    }

    [Fact]
    public void ExtractKeywords_Deduplicates()
    {
        var description = "React react REACT";
        var result = _extractor.ExtractKeywords(description);

        result.Count(r => r.Equals("React", StringComparison.OrdinalIgnoreCase)).Should().Be(1);
    }

    [Fact]
    public void ExtractKeywords_HandlesPunctuationAndLists()
    {
        var description = "Skills: Docker, Kubernetes; Terraform|Helm (CI/CD).";
        var result = _extractor.ExtractKeywords(description);

        result.Should().Contain("Docker");
        result.Should().Contain("Kubernetes");
        result.Should().Contain("Terraform");
        result.Should().Contain("Helm");
        result.Should().Contain("CI/CD");
    }
}
