# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-11-11

### Fixed

- **UI Text Correction**: Fixed inconsistent language in the NPC code generation view.

## [0.1.0] - 2025-11-11

### Added

- **Version Display**: Added the application version number to the footer for better user reference and support.
- **New NPC Indicator**: Added a visual indicator (`✨` icon with a tooltip) to the NPC Card for NPCs created less than an hour ago, making it easier to spot new content.
- **Owner Indicator**: Added a visual indicator (`✔️` icon with a tooltip) and a highlight ring to the NPC Card, clearly marking which NPCs belong to the logged-in user.
- **Form Validation**: Implemented robust client-side validation for:
  - NPC Name in the creator (minimum 3, maximum 30 characters).
  - User Display Name in profile settings (minimum 3, maximum 50 characters, must contain at least one letter).
- **Loading Skeletons**: Introduced skeleton loading states for the main NPC list page and the sort controls to prevent UI flickering and improve perceived performance while user data is being fetched.

### Changed

- **Logo Enhancement**: Updated the main logo in the navigation to include a tagline specifying the supported TFS version (`TFS ≤ 1.5`) and NPC system (`Legacy XML+Lua NPCs`).
- **AI Prompt Engineering**: Significantly improved the system prompt for the AI XML generator (`npcXmlGenerator.ts`):
  - Clarified implementation details for `Shop` and `Keywords` modules.
  - Added detailed examples for "phrase sets" in the `Keywords` module to ensure correct mapping of triggers to replies.
  - Included a more comprehensive and contextualized XML example for the AI to follow.
  - Removed redundant and potentially confusing sections to increase generation accuracy.
- **NPC Skeleton Card**: Overhauled the `NpcSkeletonCard` component to precisely match the layout and structure of the `NpcCard`, providing a more accurate and seamless loading experience.

### Fixed

- **Data Mapping for Generation**:
  - Resolved a critical bug where `Shop` and `Keywords` data, despite being saved to the database, were not included in the generated XML file. This was fixed by correctly transforming the data in the `generation-worker` Edge Function.
  - Corrected an issue where the NPC's `look.type` was always defaulting to `128` in the generated XML. The system now correctly uses the `look_type_id`.
  - Fixed the data pipeline to correctly pass the `createdAt` field from the database to the frontend `NpcListItemDto`, enabling the "New NPC Indicator" feature to work as intended.
- **UI Truncation and Overflow**:
  - Fixed UI layout issues on the `NpcCard` where long NPC and owner names would break the card's design. Both fields are now correctly truncated.
  - Resolved an overflow issue in the `UserDropdown` menu where long display names would stretch the component instead of truncating.
- **AI Keyword Generation**: Addressed a flaw in the AI's logic where it would incorrectly interpret space-separated keywords as separate phrase sets, leading to duplicated replies in the generated XML. The improved prompt now guides the AI to handle this correctly.
