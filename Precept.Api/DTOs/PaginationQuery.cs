namespace Precept.Api.DTOs;

public record PaginationQuery(int Page = 1, int PageSize = 25)
{
    public int PageSize { get; init; } = Math.Clamp(PageSize, 1, 100);
    public int Skip => (Page - 1) * PageSize;
}

public record PagedResponse<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize)
{
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
}
