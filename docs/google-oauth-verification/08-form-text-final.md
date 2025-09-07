# Google OAuth Verification Form Text

## A. Sensitive Scopes (Calendar) - "How will the scopes be used?"

### For `https://www.googleapis.com/auth/calendar.readonly` and `https://www.googleapis.com/auth/calendar.events`:

Perin uses Google Calendar solely to help users schedule meetings and manage their time. With `calendar.readonly`, Perin reads calendars to determine availability and show upcoming events to users. With `calendar.events`, Perin creates, updates, and cancels events only when the user explicitly requests it (e.g., "Schedule with Dana Tuesday 10:00–10:30"). We store minimal metadata (eventId, start/end, attendees) to keep events in sync. OAuth tokens are encrypted at rest; all data is transmitted over TLS. Users can disconnect integration at any time, which revokes tokens and deletes stored Google event metadata per our retention policy. No data is sold or used for advertising, and use is limited to the functionality described in our Privacy Policy and Terms.

## B. Restricted Scopes (Gmail) - Choose Variant

### Variant 1 (Recommended Minimal): `gmail.readonly` + `gmail.send`

Perin uses Gmail to help users draft and send replies they explicitly approve. With `gmail.readonly`, Perin reads the relevant message thread to prepare context; with `gmail.send`, Perin sends the user-approved reply from the user's mailbox. Perin does not delete messages or change settings. We store only minimal message identifiers required to keep conversation state. Tokens are encrypted at rest; data is transmitted over TLS. Users can disconnect at any time, which revokes tokens and deletes stored Gmail identifiers per our retention policy. No data is sold or used for ads; use complies with Google API Services User Data Policy (Limited Use).

### Variant 2 (If the code actually needs it): `gmail.modify`

Perin uses Gmail to triage and reply to messages with explicit user actions. With `gmail.modify`, Perin reads the relevant thread to draft a reply, can send the user-approved reply, and may apply or remove a "Perin" label to organize delegated threads. Perin does not alter account-level settings. We store only minimal message identifiers/labels necessary to keep state. Tokens are encrypted at rest; TLS in transit. Users can disconnect at any time, which revokes tokens and deletes stored Gmail identifiers per our retention policy. No data is sold or used for ads; use complies with Google API Services User Data Policy (Limited Use).

## C. "What features will you use?"

Select the following features:

- Read email to prepare replies
- Send user-approved replies
- View calendar availability
- Create/update events on user request
- Disconnect integration to revoke tokens

### In-app UI surfaces where these happen:

- **Main Chat Interface:** Users request email summaries and calendar checks
- **Integration Settings:** Users connect/disconnect Google services
- **Email Drafting:** Users review and approve AI-generated email replies
- **Calendar Scheduling:** Users request meeting creation and availability checks
- **Settings Panel:** Users manage integration permissions and data deletion

## D. Limited Use / Data Safety Statement

Perin limits Google user data access to the minimum necessary to provide user-requested features. We do not sell data or use it for advertising. Google data is not transferred to third parties except sub-processors essential to providing the service (listed in our Privacy Policy). OAuth tokens are encrypted at rest; data in transit uses HTTPS/TLS. Users can disconnect integrations at any time, which revokes tokens and triggers deletion of stored Google identifiers/metadata in accordance with our retention policy. Perin's use of Google user data complies with the Google API Services User Data Policy, including the Limited Use requirements.

## Additional Form Fields

### Privacy Policy URL:

`https://perin.ai/legal/privacy-policy`

### Terms of Service URL:

`https://perin.ai/legal/terms-of-service`

### Homepage URL:

`https://perin.ai`

### Support Email:

`hello@perin.ai`

### Data Processing Location:

United States (with appropriate safeguards for international transfers)

### Data Retention Period:

- Integration data: Until user disconnects or deletes account
- OAuth tokens: Until user disconnects or tokens expire
- Audit logs: 1 year for security and compliance

### User Data Deletion:

Users can disconnect integrations at any time through the Settings → Integrations panel. This action:

1. Revokes OAuth tokens with Google
2. Deletes stored Google identifiers and metadata
3. Removes cached Google data
4. Logs the deletion action for audit purposes

### Security Measures:

- OAuth tokens encrypted at rest using AES-256-GCM
- All API communications over HTTPS/TLS
- Rate limiting on all Google API endpoints
- Security headers (CSP, HSTS, X-Frame-Options)
- Regular security audits and monitoring

### Limited Use Compliance:

- No use of Google data for advertising
- No selling or sharing of Google data to third parties
- No use of Google data for unrelated machine learning
- All Google data access limited to user-requested features only
- Clear user consent and control over data access

## Copy-Paste Ready Text Blocks

### For Calendar Scopes Field:

```
Perin uses Google Calendar solely to help users schedule meetings. With calendar.readonly, Perin reads calendars to determine availability and show upcoming events. With calendar.events, Perin creates/updates/cancels events only when the user requests it (e.g., "Schedule with Dana Tuesday 10:00–10:30"). We store minimal metadata (eventId, start/end, attendees) to keep events in sync. OAuth tokens are encrypted at rest; all data is transmitted over TLS. Users can disconnect integration at any time, which revokes tokens and deletes stored Google event metadata per our retention policy. No data is sold or used for advertising, and use is limited to the functionality described in our Privacy Policy and Terms.
```

### For Gmail Scopes Field (Variant 1 - Recommended):

```
Perin uses Gmail to help users draft and send replies they explicitly approve. With gmail.readonly, Perin reads the relevant message thread to prepare context; with gmail.send, Perin sends the user-approved reply from the user's mailbox. Perin does not delete messages or change settings. We store only minimal message identifiers required to keep conversation state. Tokens are encrypted at rest; data is transmitted over TLS. Users can disconnect at any time, which revokes tokens and deletes stored Gmail identifiers per our retention policy. No data is sold or used for ads; use complies with Google API Services User Data Policy (Limited Use).
```

### For Gmail Scopes Field (Variant 2 - If gmail.modify is needed):

```
Perin uses Gmail to triage and reply to messages with explicit user actions. With gmail.modify, Perin reads the relevant thread to draft a reply, can send the user-approved reply, and may apply or remove a "Perin" label to organize delegated threads. Perin does not alter account-level settings. We store only minimal message identifiers/labels necessary to keep state. Tokens are encrypted at rest; TLS in transit. Users can disconnect at any time, which revokes tokens and deletes stored Gmail identifiers per our retention policy. No data is sold or used for ads; use complies with Google API Services User Data Policy (Limited Use).
```

### For Limited Use Statement:

```
Perin limits Google user data access to the minimum necessary to provide user-requested features. We do not sell data or use it for advertising. Google data is not transferred to third parties except sub-processors essential to providing the service (listed in our Privacy Policy). OAuth tokens are encrypted at rest; data in transit uses HTTPS/TLS. Users can disconnect integrations at any time, which revokes tokens and triggers deletion of stored Google identifiers/metadata in accordance with our retention policy. Perin's use of Google user data complies with the Google API Services User Data Policy, including the Limited Use requirements.
```

## Form Submission Checklist

Before submitting to Google, verify:

- [ ] All required URLs are accessible and properly formatted
- [ ] Privacy Policy includes all required contact information
- [ ] Terms of Service clearly describe Google integration features
- [ ] OAuth consent screen is properly configured with correct URLs
- [ ] Demo video is ready and demonstrates all required functionality
- [ ] All security patches have been implemented
- [ ] Token encryption is in place
- [ ] Rate limiting is configured for Google API endpoints
- [ ] Security headers are properly set
- [ ] User disconnect functionality works with token revocation
- [ ] Data deletion is properly implemented
- [ ] Audit logging is in place

## Notes for Google Reviewers

1. **Scope Justification:** We request `gmail.modify` instead of `gmail.readonly` + `gmail.send` because our current implementation uses the broader scope. We are open to reducing to the minimal scopes if approved.

2. **Data Minimization:** We only store essential metadata (message IDs, event IDs, timestamps) and never store full email bodies or sensitive personal information.

3. **User Control:** All Google data access requires explicit user action, and users can disconnect at any time with complete data deletion.

4. **Security:** We implement industry-standard security practices including token encryption, HTTPS enforcement, and comprehensive audit logging.

5. **Limited Use:** We strictly adhere to Google's Limited Use requirements with no advertising, selling, or unrelated ML use of Google data.
