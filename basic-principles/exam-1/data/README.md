# Basic Principles Exam 1 question data

This folder is the content drop zone for Basic Principles Exam 1.

Question banks should use the same canonical JSON shape supported by the shared SRNA Study Tool quiz runtime. Keep course-specific content here; do not copy shared quiz, Studio, CAT, sync, search, or analytics code into this course.

Recommended first bank file:

- `bank1.json`

When questions are ready, update `../banks.json` with the bank metadata and add the bank to `studioSources`.

Use course/exam-unique Studio keys so question UIDs remain globally distinct from Equipment calibration data. Recommended prefix:

- `bp1-b1`
- `bp1-b2`
- `bp1-b3`
- `bp1-combined`

The content taxonomy in `../banks.json` should be populated from the actual Basic Principles Exam 1 source material rather than copied from Equipment.

## Runtime rule

All Basic Principles banks use Canonical Session v1: `equipment-bank1-practice-set1-v1`, modeled on Equipment Bank 1 Practice Set 1.

Once question JSON exists, the manifest points the bank at the shared `bank.html?bank=<id>` entry. Do not create bank-specific quiz engines, shells, or styles.

## Global CAT UID namespace

Basic Principles Exam 1 owns the `bp1` namespace. Every Studio source key must begin with `bp1-`, such as `bp1-b1`, `bp1-b2`, or `bp1-combined`. Raw question IDs may remain simple numbers; the shared Studio normalization combines the source key and raw ID into a globally unique question UID for the platform-wide CAT dataset.
