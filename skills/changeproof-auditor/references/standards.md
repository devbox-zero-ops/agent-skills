# Regulatory Profiles & Input JSON Schema

## Gate Thresholds
- **FDA_21CFR11**: High Risk RPN >= 60 (3-party separation of duties: Proposer + QA Approver + Release Authority), Critical >= 120, SOP review cycle 365 days.
- **ISO_13485**: High Risk RPN >= 48, Critical >= 100, SOP review cycle 365 days.
- **AS9100D**: High Risk RPN >= 45, Critical >= 90, SOP review cycle 180 days.

## Sample `change_request.json`
```json
{
  "issue": {
    "key": "QMS-42",
    "summary": "Update Sterile Fill Sensor Calibration per SOP-QA-104",
    "description": "Severity: 8, Occurrence: 4, Detectability: 3. Linked CAPA-2026-009 with IQ/OQ validation and rollback plan.",
    "priority": "High",
    "reporterAccountId": "acct-eng-01"
  },
  "confluencePages": [
    {
      "id": "9001",
      "title": "SOP-QA-104 Sterile Fill Calibration Procedure",
      "version": 6,
      "lastUpdated": "2024-01-10T00:00:00.000Z"
    }
  ]
}
```
