using System.Text.RegularExpressions;
using Precept.Api.Services.Interfaces;

namespace Precept.Api.Services;

/// <summary>
/// Deterministic, server-side keyword extractor for job descriptions.
/// Matches a curated technology/skill dictionary against the description text.
/// </summary>
public partial class JobDescriptionKeywordExtractor : IJobDescriptionKeywordExtractor
{
    // Curated dictionary of skills, technologies, tools, and concepts commonly
    // requested in software-engineering and adjacent job descriptions.
    // Keep casing consistent (Pascal/camel) because it is surfaced in the UI.
    private static readonly HashSet<string> KeywordDictionary = new(StringComparer.OrdinalIgnoreCase)
    {
        // Languages
        "C", "C++", "C#", "Java", "Python", "JavaScript", "TypeScript", "Go", "Golang", "Rust",
        "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB", "Perl", "Lua", "Dart",
        "Objective-C", "Shell", "Bash", "PowerShell", "SQL", "HTML", "CSS", "Sass", "SCSS",
        "JSON", "XML", "YAML", "Markdown",

        // Frontend frameworks/libraries
        "React", "React Native", "Vue", "Vue.js", "Angular", "Svelte", "Next.js", "Nuxt",
        "Redux", "Zustand", "MobX", "Recoil", "Jotai", "TanStack Query", "React Query",
        "Tailwind CSS", "Bootstrap", "Material UI", "MUI", "Chakra UI", "Ant Design",
        "Styled Components", "Emotion", "Framer Motion", "GSAP", "Three.js", "D3.js",
        "Webpack", "Vite", "Rollup", "Parcel", "esbuild", "Babel", "SWC",

        // Backend frameworks/platforms
        "ASP.NET", "ASP.NET Core", ".NET", ".NET Core", "Node.js", "Express", "Fastify",
        "NestJS", "Django", "Flask", "FastAPI", "Spring", "Spring Boot", "Ruby on Rails",
        "Laravel", "Symfony", "Phoenix", "Rocket", "Actix",

        // Databases / data stores
        "PostgreSQL", "Postgres", "MySQL", "MariaDB", "SQL Server", "SQLite", "Oracle",
        "MongoDB", "DynamoDB", "Cassandra", "Redis", "Elasticsearch", "Neo4j", "Couchbase",
        "Firebase", "Supabase", "PlanetScale", "CockroachDB", "ClickHouse", "Snowflake",
        "BigQuery", "RDS", "Prisma", "Dapper", "Entity Framework", "EF Core", "Hibernate",
        "Sequelize", "TypeORM", "Mongoose", "SQLAlchemy", "LINQ",

        // Cloud / infrastructure
        "AWS", "Azure", "GCP", "Google Cloud", "Heroku", "Vercel", "Netlify", "Cloudflare",
        "DigitalOcean", "Linode", "Kubernetes", "K8s", "Docker", "Terraform", "Pulumi",
        "CloudFormation", "Ansible", "Chef", "Puppet", "Jenkins", "GitHub Actions",
        "GitLab CI", "CircleCI", "Travis CI", "ArgoCD", "Flux", "Helm", "Istio", "Linkerd",
        "Nginx", "Apache", "Kafka", "RabbitMQ", "ActiveMQ", "SQS", "SNS", "EventBridge",
        "Lambda", "Azure Functions", "Cloud Functions", "EC2", "ECS", "EKS", "Fargate",
        "App Service", "Cloud Run", "OpenShift", "Rancher",

        // DevOps / observability
        "CI/CD", "DevOps", "SRE", "Site Reliability", "Observability", "Monitoring",
        "Logging", "Tracing", "Prometheus", "Grafana", "Datadog", "New Relic", "Splunk",
        "ELK", "OpenTelemetry", "Jaeger", "PagerDuty", "Opsgenie",

        // Testing / QA
        "Testing", "Unit Testing", "Integration Testing", "E2E Testing", "TDD",
        "Test Driven Development", "BDD", "Jest", "Mocha", "Cypress", "Playwright",
        "Selenium", "Vitest", "JUnit", "NUnit", "xUnit", "PyTest", "Postman", "JUnit",
        "k6", "Load Testing", "Performance Testing",

        // Security
        "Security", "OAuth", "OIDC", "OpenID Connect", "SAML", "SSO", "MFA", "JWT",
        "TLS", "SSL", "HTTPS", "Penetration Testing", "OWASP", "Encryption", "Hashing",

        // AI / ML / data
        "Machine Learning", "Deep Learning", "AI", "Artificial Intelligence", "NLP",
        "Natural Language Processing", "Computer Vision", "LLM", "OpenAI", "LangChain",
        "LangGraph", "Hugging Face", "Transformers", "PyTorch", "TensorFlow", "Keras",
        "Scikit-learn", "Pandas", "NumPy", "SciPy", "Matplotlib", "Seaborn", "Jupyter",
        "Spark", "Apache Spark", "Hadoop", "Airflow", "dbt", "Kafka", "Flink",
        "Data Engineering", "Data Science", "Data Analysis", "ETL", "Data Pipeline",

        // Concepts / practices
        "REST", "REST API", "GraphQL", "gRPC", "SOAP", "WebSocket", "WebSockets", "HTTP",
        "API Design", "Microservices", "Monolith", "Serverless", "Event Driven",
        "Event-Driven Architecture", "Domain Driven Design", "DDD", "Clean Architecture",
        "CQRS", "Event Sourcing", "Saga", "Circuit Breaker", "Rate Limiting", "Caching",
        "CDN", "Load Balancing", "Horizontal Scaling", "Vertical Scaling", "Sharding",
        "Replication", "CAP Theorem", "SOLID", "Design Patterns", "Agile", "Scrum",
        "Kanban", "Pair Programming", "Code Review", "Git", "GitHub", "GitLab",
        "Bitbucket", "Jira", "Confluence", "Linear", "Notion",

        // Mobile / desktop
        "iOS", "Android", "Flutter", "React Native", "Xamarin", "Ionic", "Cordova",
        "Electron", "Tauri", "SwiftUI", "UIKit", "Jetpack Compose",

        // Methodologies / roles
        "Full Stack", "Full-Stack", "Frontend", "Backend", "Back End", "API",
        "Distributed Systems", "System Design", "High Availability", "Fault Tolerance",
        "Reliability", "Performance", "Optimization", "Scalability", "Maintainability",
    };

    // Split on whitespace and common punctuation, but keep '/' so that terms
    // like "CI/CD" remain intact for phrase matching.
    [GeneratedRegex(@"[\s\(\)\[\]\{\},;\\|]+", RegexOptions.Compiled)]
    private static partial Regex TokenSplitter();

    public IReadOnlyList<string> ExtractKeywords(string description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return [];

        var normalized = description.ToLowerInvariant();
        var tokens = TokenSplitter()
            .Split(normalized)
            .Select(t => t.Trim('.', '+', '#', ':', ';', '!', '?', '"', '\'', '(', ')', '[', ']', '{', '}'))
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .ToHashSet();

        var found = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var keyword in KeywordDictionary)
        {
            if (found.Contains(keyword))
                continue;

            if (keyword.Contains(' '))
            {
                if (ContainsPhrase(normalized, keyword))
                    found.Add(keyword);
            }
            else
            {
                if (tokens.Contains(keyword.ToLowerInvariant()))
                    found.Add(keyword);
            }
        }

        return found.ToList();
    }

    private static bool ContainsPhrase(string normalizedText, string phrase)
    {
        var lowerPhrase = phrase.ToLowerInvariant();
        var index = normalizedText.IndexOf(lowerPhrase, StringComparison.OrdinalIgnoreCase);
        while (index >= 0)
        {
            var left = index == 0 || !char.IsLetterOrDigit(normalizedText[index - 1]);
            var right = index + lowerPhrase.Length >= normalizedText.Length ||
                        !char.IsLetterOrDigit(normalizedText[index + lowerPhrase.Length]);
            if (left && right)
                return true;

            index = normalizedText.IndexOf(lowerPhrase, index + 1, StringComparison.OrdinalIgnoreCase);
        }
        return false;
    }
}
