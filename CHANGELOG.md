# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-23

### Added
- **Analytics Dashboard**: Implemented data visualization using Recharts and added liquid glass confirmation modals.
- **True Trajectory Scanner**: Overhauled scanner logic and migrated to containerized PostgreSQL.
- **Story Bank**: Expanded story tracking capabilities and refined system diagnostics.
- **Web Application**: Scaffolded React frontend alongside ASP.NET Core API for the complete project architecture.
- **Authentication**: Implemented core identity infrastructure with JWT authentication and secure refresh token rotation.
- **Database**: Added EF Core identity support and initialized project with the domain models and production settings.
- **Documentation**: Added MIT license and updated the architectural schema and roadmap in the project documentation.

### Changed
- **AI Architecture**: Removed the frontend Gemini SDK to securely defer AI analysis entirely to the server-side.
- **Authentication Security**: Engineered dead-heat concurrency guards for the RefreshToken mechanism and streamlined the auth flow.
- **User Identity**: Updated authentication models to utilize email addresses as the primary username identifier.
- **Documentation**: Updated the README to reflect hosted SaaS framing and accurately portray current features.

### Fixed
- **Testing**: Updated the test suite to ensure coverage for the new auth concurrency guards.

### Chore
- Updated `.gitignore` to comprehensively exclude the `.vscode` directory rather than just its contents.
