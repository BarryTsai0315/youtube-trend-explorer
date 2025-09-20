# Tasks: YouTube 熱門影片搜尋器

**Input**: Design documents from `/specs/001-users-barry-tsai/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Google Apps Script, HTML5/CSS3, YouTube Data API v3
   → Structure: Web application (frontend + backend)
2. Load design documents:
   → data-model.md: 4 entities (Video, SearchFilter, SearchResult, UIState)
   → contracts/: 2 files (API contract, contract tests)
   → research.md: Google Apps Script integration decisions
3. Generate tasks by category:
   → Setup: Apps Script project, API keys, dependencies
   → Tests: API contract tests, integration tests
   → Core: API routes, data services, frontend components
   → Integration: YouTube API, Google Sheets, caching
   → Polish: performance optimization, error handling
4. Apply task rules based on Google Apps Script architecture
5. Number tasks sequentially (T001-T025)
6. Return: SUCCESS (25 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Paths based on existing project structure + new components

## Path Conventions
- **Backend**: Extend existing `ai_youtube_webapp.gs`
- **Frontend**: Extend existing `video-search.html`
- **Tests**: New `tests/` directory structure
- **Docs**: Update existing documentation

## Phase 3.1: Setup & Environment
- [ ] T001 Create project directory structure for tests and new components
- [ ] T002 [P] Set up Google Apps Script project with YouTube Data API v3 service
- [ ] T003 [P] Configure environment variables for API keys and Sheet IDs in Apps Script
- [ ] T004 [P] Create `tests/` directory with contract, integration, and unit subdirectories

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Contract test for search API (action=search) in `tests/contract/test_search_api.js`
- [ ] T006 [P] Contract test for filter API (action=filter) in `tests/contract/test_filter_api.js`
- [ ] T007 [P] Contract test for suggestions API (action=suggestions) in `tests/contract/test_suggestions_api.js`
- [ ] T008 [P] Integration test for keyword search flow in `tests/integration/test_search_flow.js`
- [ ] T009 [P] Integration test for advanced filtering in `tests/integration/test_filter_flow.js`
- [ ] T010 [P] Integration test for pagination functionality in `tests/integration/test_pagination.js`
- [ ] T011 [P] Integration test for error handling scenarios in `tests/integration/test_error_handling.js`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend API Extensions
- [ ] T012 Extend doGet() function with new routing system for search/filter/suggestions actions in `ai_youtube_webapp.gs`
- [ ] T013 [P] Implement Video data model validation and transformation functions in `ai_youtube_webapp.gs`
- [ ] T014 [P] Implement SearchFilter parameter normalization and validation in `ai_youtube_webapp.gs`
- [ ] T015 Create handleSearchRequest() function with YouTube API integration in `ai_youtube_webapp.gs`
- [ ] T016 Create handleFilterRequest() function with Google Sheets filtering in `ai_youtube_webapp.gs`
- [ ] T017 Create handleSuggestionsRequest() function with keyword/hashtag suggestions in `ai_youtube_webapp.gs`
- [ ] T018 Implement unified caching strategy using Apps Script Cache Service in `ai_youtube_webapp.gs`

### Frontend Components
- [ ] T019 [P] Create SearchComponent with advanced filters UI in new `src/components/search.js`
- [ ] T020 [P] Create FilterComponent with date/view range controls in new `src/components/filter.js`
- [ ] T021 [P] Create ResultsComponent with video card display in new `src/components/results.js`
- [ ] T022 [P] Create PaginationComponent with page navigation in new `src/components/pagination.js`
- [ ] T023 Update main HTML file with new component integration in `video-search.html`

## Phase 3.4: Integration & Data Services
- [ ] T024 Implement YouTube API quota management and rate limiting in `ai_youtube_webapp.gs`
- [ ] T025 Create Google Sheets data access layer with caching in `ai_youtube_webapp.gs`
- [ ] T026 Implement error handling and retry mechanisms for API calls in `ai_youtube_webapp.gs`
- [ ] T027 Add response formatting and CORS headers for web app in `ai_youtube_webapp.gs`

## Phase 3.5: Polish & Optimization
- [ ] T028 [P] Add client-side validation and input sanitization in `src/utils/validation.js`
- [ ] T029 [P] Implement performance monitoring and logging in `src/utils/monitoring.js`
- [ ] T030 [P] Add loading states and progress indicators to UI components
- [ ] T031 [P] Create comprehensive error messages and user feedback in `src/utils/errors.js`
- [ ] T032 Update quickstart.md with deployment and configuration instructions
- [ ] T033 [P] Add unit tests for utility functions in `tests/unit/test_utils.js`
- [ ] T034 Performance optimization: implement request debouncing and caching in frontend
- [ ] T035 Final integration testing and manual validation following quickstart.md

## Dependencies
- Setup (T001-T004) before everything else
- Tests (T005-T011) before implementation (T012-T027)
- T012 (routing) blocks T015-T017 (handlers)
- T013-T014 (data models) enable T015-T017 (API handlers)
- T015-T017 (backend) before T019-T023 (frontend)
- T024-T027 (integration) before T028-T035 (polish)

## Parallel Execution Examples

### Phase 3.2 - All contract tests can run in parallel:
```bash
# Launch contract tests together:
Task: "Contract test for search API (action=search) in tests/contract/test_search_api.js"
Task: "Contract test for filter API (action=filter) in tests/contract/test_filter_api.js"
Task: "Contract test for suggestions API (action=suggestions) in tests/contract/test_suggestions_api.js"
```

### Phase 3.2 - All integration tests can run in parallel:
```bash
# Launch integration tests together:
Task: "Integration test for keyword search flow in tests/integration/test_search_flow.js"
Task: "Integration test for advanced filtering in tests/integration/test_filter_flow.js"
Task: "Integration test for pagination functionality in tests/integration/test_pagination.js"
Task: "Integration test for error handling scenarios in tests/integration/test_error_handling.js"
```

### Phase 3.3 - Data model tasks can run in parallel:
```bash
# Launch data model tasks together:
Task: "Implement Video data model validation and transformation functions in ai_youtube_webapp.gs"
Task: "Implement SearchFilter parameter normalization and validation in ai_youtube_webapp.gs"
```

### Phase 3.3 - Frontend components can run in parallel:
```bash
# Launch frontend component tasks together:
Task: "Create SearchComponent with advanced filters UI in src/components/search.js"
Task: "Create FilterComponent with date/view range controls in src/components/filter.js"
Task: "Create ResultsComponent with video card display in src/components/results.js"
Task: "Create PaginationComponent with page navigation in src/components/pagination.js"
```

### Phase 3.5 - Polish tasks can run in parallel:
```bash
# Launch polish tasks together:
Task: "Add client-side validation and input sanitization in src/utils/validation.js"
Task: "Implement performance monitoring and logging in src/utils/monitoring.js"
Task: "Create comprehensive error messages and user feedback in src/utils/errors.js"
Task: "Add unit tests for utility functions in tests/unit/test_utils.js"
```

## Special Considerations for Google Apps Script

### Deployment Strategy
- Single `ai_youtube_webapp.gs` file contains all backend logic
- HTML file served from Apps Script contains frontend
- Tests run separately using external frameworks (Jest/Node.js)

### API Constraints
- 6-minute execution limit per request
- YouTube API quota: 10,000 units/day
- Cache service: 6-hour maximum retention
- Concurrent executions: 30 maximum

### File Structure After Implementation
```
Repository Root:
├── ai_youtube_webapp.gs          # Extended backend (main implementation file)
├── video-search.html             # Enhanced frontend
├── src/
│   ├── components/               # New frontend components
│   └── utils/                   # Client-side utilities
├── tests/
│   ├── contract/               # API contract tests
│   ├── integration/           # End-to-end tests
│   └── unit/                  # Unit tests
└── docs/                      # Updated documentation
```

## Task Generation Rules Applied
1. **From Contracts**: Each API endpoint (search, filter, suggestions) → contract test + implementation
2. **From Data Model**: Each entity (Video, SearchFilter, SearchResult, UIState) → validation/transformation tasks
3. **From User Stories**: Search flow, filter flow, pagination → integration tests
4. **TDD Ordering**: All tests before any implementation
5. **Parallel Marking**: Different files or independent functionality = [P]

## Validation Checklist
- [x] All API contracts have corresponding tests (T005-T007)
- [x] All data entities have model tasks (T013-T014)
- [x] All tests come before implementation (T005-T011 before T012-T027)
- [x] Parallel tasks are truly independent (different files/components)
- [x] Each task specifies exact file path
- [x] No [P] tasks modify the same file

## Notes
- **TDD Critical**: Tests T005-T011 MUST fail before implementing T012+
- **Apps Script Limitation**: Backend tasks mostly in single file (not parallelizable)
- **Frontend Components**: Fully parallelizable (separate files)
- **Testing Strategy**: External framework for comprehensive testing
- **Deployment**: Single Apps Script deployment includes all backend changes