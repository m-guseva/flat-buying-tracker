# Flat Buying Tracker — Product Specification

## 1. Product concept

Build a personal web app for managing the process of buying an apartment.

The app is **not** an apartment search portal. Its purpose is to act as a central workspace for apartments found on portals such as ImmoScout24 and Immowelt.

The user currently discovers apartments manually on those portals. For the MVP, the user should be able to paste or drag a listing URL into the app. The app then scrapes the listing and creates an apartment card.

The application should eventually support direct integrations with ImmoScout24, Immowelt and email, but **do not implement those integrations in the MVP**. The architecture should, however, make it possible to add them later.

The core concepts are:

1. **Properties** — information about the apartment itself.
2. **Status** — where the apartment currently is in the buying process.
3. **Documents** — files associated with the apartment.
4. **Notes / additional information**.
5. **Views** — card/grid view and table view.
6. **Filtering and sorting**.

---

# 2. Main application layout

The main screen should show all tracked apartments.

At the top:

* App title
* Search
* View toggle:

  * `Card view`
  * `Table view`
* Filters
* Sort
* `+ Add apartment`

The default view is **Card view**.

---

# 3. Adding an apartment

There should be a prominent `+` card in the apartment grid.

Example:

```text
┌─────────────────────────┐
│                         │
│           +             │
│                         │
│      Add apartment      │
│                         │
│  Paste or drop a link   │
│                         │
└─────────────────────────┘
```

The user can:

* click the card and paste a URL
* drag a URL/link onto the card
* ideally drag a URL directly from the browser onto the card

After receiving the URL:

1. Detect the source website.
2. Fetch/scrape the page.
3. Extract available apartment information.
4. Extract apartment images.
5. Create a new apartment record.
6. Display the apartment in the grid.

Show a loading state while scraping:

```text
Fetching listing...
Extracting apartment information...
Loading images...
```

If scraping fails, still create the apartment with:

* URL
* source
* manually editable fields

and inform the user that some information could not be extracted.

---

# 4. Scraping

For the MVP, support at minimum:

* ImmoScout24
* Immowelt

The scraper should attempt to extract:

* Listing title
* Address
* Price
* Number of rooms
* Living area
* Floor
* Balcony / terrace
* Elevator
* Kitchen
* Condition
* Hausgeld
* Maklerprovision (if yes, how much)
* URL
* Listing images

Do not assume that every field will be available.

All scraped properties must remain easily editable by the user.

Important: scraped information should not overwrite manually edited information unless explicitly requested by the user.

Store the original listing URL.

The scraper should be implemented as a replaceable service/module so additional portals can be added later.

---

# 5. Apartment card

Each apartment appears as a card in the grid.

The card should prominently show:

### Image gallery

Use the images scraped from the listing.

Display one large image.

Provide left/right arrows to navigate through the available images.

Example:

```text
┌──────────────────────────────────┐
│                                  │
│        APARTMENT IMAGE           │
│                                  │
│   ‹                          ›   │
│                                  │
├──────────────────────────────────┤
│ Müllerstraße 42                  │
│ €425,000                         │
│ 58 m² · 2 rooms                  │
│                                  │
│ 🟡 Contacted                     │
│                                  │
│ Viewing: Not scheduled            │
└──────────────────────────────────┘
```

Images should be stored/referenced separately from the apartment data.

If no image can be scraped, show a neutral placeholder.

The card should also display a small status indicator.

Clicking anywhere on the card, except specific controls, opens the apartment detail page.

---

# 6. Apartment detail page

Each apartment card behaves conceptually like a **Notion page**.

Clicking a card opens a detailed page containing editable properties, documents and notes.

The page should be organized into property groups.

---

# 7. Property group: Apartment / Object information

Create the following properties.

### Basic

* Title / listing name
* Address
* Price
* Living area (m²)
* Number of rooms

### Property characteristics

* Floor
* Balcony / terrace
* Elevator
* Kitchen
* Condition
* Hausgeld

### Location / evaluation

* Location rating
* Personal rating

The ratings should support a simple numeric or star-based value.

All properties are editable.

Properties should support appropriate data types:

* Price → currency / number
* Area → number
* Rooms → number
* Floor → text or number
* Balcony → boolean
* Elevator → boolean
* Kitchen → boolean/text
* Condition → select/text
* Hausgeld → currency
* Ratings → numeric rating

The exact UI should remain flexible, but it should feel similar to editing properties in Notion.

---

# 8. Property group: Process / status

Create a separate property family for the progress of the apartment through the buying process.

Primary status:

1. `Not contacted yet`
2. `Contacted`
3. `Received Exposé`
4. `Setup viewing`
5. `Post-viewing stage`
6. `Interest for purchase`

The statuses should be visually distinct and selectable from the apartment detail page and, where practical, directly from the card.

The user should be able to change the status manually.

Store the timestamp of status changes so that the app can later support a timeline/history.

Example:

```text
Status history

06 Sep — Contacted
04 Sep — Think if to contact
```

---

# 9. Maklervertrag tracking

Create a separate property:

### Maklervertrag

Possible values:

* `Not received`
* `Received`
* `Signed`
* `Widerruf`

For the MVP, the important distinction is whether a Maklervertrag was associated with the Exposé.

The workflow should support cases where:

### Case A

Makler sends:

> Exposé + Maklervertrag

The user can mark:

`Maklervertrag: Received`

### Case B

Makler sends:

> Exposé only

The user can mark:

`Maklervertrag: Not received`



This should be visible in the apartment overview because it is an important part of the process.

---

# 10. Documents / files

Every apartment page should have a document/file section.

The user must be able to drag files into the apartment page.

Examples:

* Exposé PDF
* Maklervertrag PDF
* Personal viewing checklist PDF
* Grundriss
* Energieausweis
* WEG documents
* Photos
* Other PDFs
* Other files

Example:

```text
Documents

┌──────────────────────────────────────────────┐
│ 📄 Exposé_Müllerstraße.pdf                   │
│    Added 06 Sep                              │
├──────────────────────────────────────────────┤
│ 📄 Maklervertrag.pdf                         │
│    Added 06 Sep                              │
├──────────────────────────────────────────────┤
│ 📄 Wohnungsbesichtigung_Checkliste.pdf       │
│    Added 06 Sep                              │
└──────────────────────────────────────────────┘

        + Drop files here
```

Files should belong explicitly to one apartment.

The user should be able to:

* upload
* drag & drop
* open
* download
* delete

For PDFs, show the filename and PDF icon.

For images, show a thumbnail where appropriate.

The application should preserve the original file.

---

# 11. Notes

Each apartment page should have a free-form notes area.

This is intentionally simple for the MVP.

Example:

```text
Notes

Really like the light and location.
Kitchen is quite old.
Need to ask about planned renovation of the roof.
```

Notes should be editable and automatically saved.

---

# 12. Listing URL

Every apartment should retain the original listing URL.

Display:

```text
Source: ImmoScout24
[Open original listing ↗]
```

or:

```text
Source: Immowelt
[Open original listing ↗]
```

Opening it should open the original listing in a new browser tab.

---

# 13. Card view

The card view is the default.

Use a responsive grid.

Each card should show enough information to identify and quickly evaluate an apartment without opening it.

Minimum card information:

* Main image
* Address / title
* Price
* m²
* Rooms
* Current process status
* Optional key indicator such as Maklervertrag status

Cards should be reasonably compact so that several apartments can be viewed simultaneously.

The user should be able to quickly scan their apartment search.

---

# 14. Table view

Add a toggle between:

```text
[ Cards ] [ Table ]
```

Table view should display one apartment per row.

Example:

| Apartment           | Price | m² | Rooms | Floor | Hausgeld | Status    | Maklervertrag |
| ------------------- | ----: | -: | ----: | ----- | -------: | --------- | ------------- |
| Müllerstraße 42     | €425k | 58 |     2 | 3     |     €280 | Contacted | Received      |
| Prenzlauer Allee 18 | €450k | 61 |     2 | 5     |     €310 | Exposé    | Not received  |

The user should be able to configure which properties appear as table columns.

---

# 15. Table column selection

Provide a control such as:

`Columns`

Clicking it opens a list of available properties.

Example:

```text
Columns

☑ Address
☑ Price
☑ Living area
☑ Rooms
☐ Floor
☐ Balcony
☑ Hausgeld
☑ Status
☑ Maklervertrag
☐ Condition
☐ Personal rating
```

The selected columns determine what appears in the table.

The selection should persist between sessions.

---

# 16. Filtering

The table/card collection should support filtering by properties.

Create a `Filter` control.


Examples:

```text
Filter

Status = Contacted

Price < €450,000

Rooms >= 2

Balcony = Yes
```

Multiple filters should be combinable.

Example:

```text
Status = Contacted
AND
Price < €450,000
AND
Balcony = Yes
```

The filter UI should make it obvious which filters are active.

Provide `Clear filters`.

---

# 17. Sorting

Provide a `Sort` control.

The user should be able to sort by any sortable property.

Examples:

* Price: low → high
* Price: high → low
* Living area: small → large
* Living area: large → small
* Personal rating: high → low
* Hausgeld: low → high
* Date added: newest → oldest
* Status

Allow multiple sort criteria if practical.

Example:

```text
Sort by:
Personal rating ↓
then Price ↑
```

---

# 18. Search

Add a global search field.

Search should search at minimum:

* Address
* Title
* Notes
* Source
* potentially document filenames

Example:

Searching:

`Müllerstraße`

should find the corresponding apartment.

---

# 19. Apartment creation / editing

There should always be a way to manually create an apartment without a URL.

This is important because:

* some listings may be shared privately
* scraping may fail
* the user may want to enter an apartment from another source

Manual creation should expose the same properties as a scraped apartment.

---

# 20. Duplicate handling

If the user adds the same URL twice, detect that it is likely a duplicate.

Do not automatically create a second apartment.

Instead show:

> This listing may already exist.

with:

`Open existing apartment`

and

`Create anyway`

Potential future enhancement: detect duplicates based on address even if URLs differ.

---

# 21. Data model

Use a data model that separates the apartment/object data from workflow/status data.

Conceptually:

```text
Apartment
├── id
├── title
├── source
├── sourceUrl
├── address
├── price
├── livingArea
├── rooms
├── floor
├── balcony
├── elevator
├── kitchen
├── condition
├── hausgeld
├── locationRating
├── personalRating
├── status
├── maklervertragStatus
├── notes
├── createdAt
├── updatedAt
└── images[]

Document
├── id
├── apartmentId
├── filename
├── fileType
├── filePath/storageReference
├── createdAt
└── metadata

StatusHistory
├── id
├── apartmentId
├── status
└── timestamp
```

Keep documents and images separate from the main apartment object.

---

# 22. Important architectural requirement

Design the application so that data sources can be added later.

Currently:

```text
Manual URL input
       ↓
Listing scraper
       ↓
Apartment database
```

Later:

```text
ImmoScout API ─────┐
Immowelt API ──────┤
Email integration ─┤
Manual URL ────────┤
                   ↓
            Apartment database
```

Do not tightly couple the UI to the scraper.

The UI should simply receive a normalized apartment object.

---

# 23. MVP scope

The MVP should include:

### Required

* Apartment grid
* `+ Add apartment` card
* URL input
* Drag-and-drop URL support where technically possible
* Listing scraping
* Image extraction
* Image carousel on cards
* Editable apartment properties
* Status property
* Maklervertrag property
* Apartment detail page
* File upload / drag-and-drop
* Notes
* Card/table toggle
* Configurable table columns
* Filtering
* Sorting
* Search
* Manual apartment creation
* Persistent storage
* Duplicate URL detection

### Explicitly NOT required yet

Do not implement:

* ImmoScout API integration
* Immowelt API integration
* Email integration
* Automatic email classification
* Automatic document classification
* AI assistant
* Calendar integration
* Financing tracking
* Notary tracking
* Offer management
* Notifications
* Multi-user functionality

However, structure the code so these can be added later.

---

# 24. UX principles

The app should feel like a **personal workspace**, not a corporate CRM.

Prioritize:

* clean interface
* visual apartment cards
* large apartment photos
* minimal friction when adding a listing
* easy editing
* drag-and-drop
* fast filtering
* clear process status
* no unnecessary complexity

The most important user experience should be:

**See apartment → drop link → apartment appears → everything related to that apartment lives in one place.**

The application should make it immediately obvious:

1. What apartments am I tracking?
2. What is the current status of each?
3. Which apartments are worth looking at?
4. What documents belong to each?
5. What information do I have/miss?
6. Where do I need to take action?

---

# 25. Delivered beyond the original MVP scope

The following were added after the MVP shipped, driven by real usage rather than by this spec — recorded here so the spec stays an accurate description of the app, not just of the original plan:

* **Delete apartment** — each card has a delete control; deleting also removes the apartment's uploaded files from disk, not just its database row.
* **Cover image selection** — within the apartment detail view, any photo in the carousel can be pinned as the card's title/cover image.
* **Paste-to-upload images** — pasting an image (e.g. a screenshot, or a copy from Finder/a browser) anywhere on an apartment's detail view uploads it as a new photo, no dedicated upload button required.
* **Visual redesign** — a glassmorphism-style visual language (translucent panels, backdrop blur, a soft gradient background) replaced the original plain design across cards, table, detail overlay, and forms. Section 24's UX principles (clean, personal-workspace feel) still hold; this is the concrete visual execution of them.

---

# 26. Future direction

The long-term product can evolve into a full apartment-buying command center.

Potential future workflow:

```text
Listing found
      ↓
Contact decision
      ↓
Contacted
      ↓
Exposé received
      ↓
Maklervertrag?
      ↓
Viewing
      ↓
Viewing checklist
      ↓
Documents / due diligence
      ↓
Interest in purchase
      ↓
Offer
      ↓
Financing
      ↓
Notary
      ↓
Purchase
```

The current MVP should focus only on the first part of this journey while establishing the underlying apartment-centric data model.
