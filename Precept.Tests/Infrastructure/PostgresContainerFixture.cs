using Testcontainers.PostgreSql;

namespace Precept.Tests.Infrastructure;

/// <summary>
/// Manages a single PostgreSQL Testcontainer shared across the entire test session.
/// Each test CLASS creates its own isolated GUID-named database inside this container.
/// </summary>
public class PostgresContainerFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("precept_test_root")
        .WithUsername("precept_test")
        .WithPassword("precept_test_password")
        .Build();

    public string GetConnectionString(string databaseName) =>
        $"Host={_container.Hostname};Port={_container.GetMappedPublicPort(5432)};" +
        $"Database={databaseName};Username=precept_test;Password=precept_test_password;Include Error Detail=true";

    public string RootConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync() => await _container.StartAsync();

    public async Task DisposeAsync() => await _container.DisposeAsync();
}

/// <summary>
/// xUnit collection definition — one container shared across all integration test classes.
/// </summary>
[CollectionDefinition("Integration")]
public class IntegrationCollection : ICollectionFixture<PostgresContainerFixture> { }
