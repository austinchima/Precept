using Npgsql;
using Testcontainers.PostgreSql;

namespace Precept.Tests.Infrastructure;

/// <summary>
/// Manages the PostgreSQL test database backing store.
/// 
/// By default a Testcontainers Postgres container is started. When the
/// <c>ConnectionStrings__PreceptDb</c> (or <c>PRECEPT_TEST_DB_CONNECTION</c>)
/// environment variable is set, the fixture uses that externally provisioned
/// Postgres server instead. This allows CI workflows that start Postgres via a
/// service container to be used without Docker-in-Docker support.
/// 
/// Each test CLASS still creates its own isolated GUID-named database on the
/// chosen server.
/// </summary>
public class PostgresContainerFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer? _container;
    private readonly string? _externalConnectionString;
    private readonly bool _useExternal;

    public PostgresContainerFixture()
    {
        _externalConnectionString = Environment.GetEnvironmentVariable("ConnectionStrings__PreceptDb")
            ?? Environment.GetEnvironmentVariable("PRECEPT_TEST_DB_CONNECTION");

        _useExternal = !string.IsNullOrWhiteSpace(_externalConnectionString);
        if (!_useExternal)
        {
            _container = new PostgreSqlBuilder()
                .WithImage("postgres:16-alpine")
                .WithDatabase("precept_test_root")
                .WithUsername("precept_test")
                .WithPassword("precept_test_password")
                .Build();
        }
    }

    public string GetConnectionString(string databaseName)
    {
        if (_useExternal)
        {
            var builder = new NpgsqlConnectionStringBuilder(_externalConnectionString!)
            {
                Database = databaseName
            };
            return builder.ConnectionString;
        }

        return $"Host={_container!.Hostname};Port={_container.GetMappedPublicPort(5432)};" +
               $"Database={databaseName};Username=precept_test;Password=precept_test_password;Include Error Detail=true";
    }

    /// <summary>
    /// Connection string to a database suitable for issuing CREATE/DROP DATABASE
    /// commands. For Testcontainers this is the container's default database; for
    /// an external server it points to the <c>postgres</c> maintenance database.
    /// </summary>
    public string RootConnectionString
    {
        get
        {
            if (_useExternal)
            {
                var builder = new NpgsqlConnectionStringBuilder(_externalConnectionString!)
                {
                    Database = "postgres"
                };
                return builder.ConnectionString;
            }

            return _container!.GetConnectionString();
        }
    }

    public Task InitializeAsync()
    {
        if (!_useExternal)
        {
            return _container!.StartAsync();
        }

        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        if (!_useExternal)
        {
            return _container!.DisposeAsync().AsTask();
        }

        return Task.CompletedTask;
    }
}

/// <summary>
/// xUnit collection definition — one backing store shared across all database test classes.
/// </summary>
[CollectionDefinition("Integration")]
public class IntegrationCollection : ICollectionFixture<PostgresContainerFixture> { }
