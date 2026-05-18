---
title: "Out of Office Not Sending in Microsoft 365: Why Automatic Replies Stop Working and How to Fix Them"
excerpt: "OOF is turned on but external senders aren't getting replies. Walk the external-replies toggle, the once-per-sender rule, the spam-filter override, transport rules that suppress OOFs, and the remote domain configuration that controls everything."
coverImage: "/assets/blog/microsoft-365-out-of-office-automatic-replies-not-working/diagram.svg"
date: "2026-05-14T09:00:00.000Z"
author:
  name: "M.U"
ogImage:
  url: "/assets/blog/microsoft-365-out-of-office-automatic-replies-not-working/diagram.svg"
---

## The vacation that produced an angry customer

A senior account manager goes on vacation, turns on Out of Office, sets the dates, writes a tasteful "I'll be back on..." reply. Returns to find that *none* of their external customers received the auto-reply. The customers — surprise — are not pleased. The user's view is "I set Out of Office, it didn't work, this is broken." The technical reality is that Exchange Online's automatic-replies behaviour is conditional on at least six different settings, several of which are not exposed in Outlook's OOF dialog and most of which an end user has no way to verify.

This article walks the six-condition matrix that decides whether an OOF actually sends, the PowerShell to inspect each condition, and the tenant-level configuration choices that are the most common root causes. References: [Configure Automatic Replies](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-user-mailboxes/configure-automatic-replies-for-a-user-mailbox), [Get-MailboxAutoReplyConfiguration](https://learn.microsoft.com/powershell/module/exchange/get-mailboxautoreplyconfiguration), [Set-RemoteDomain](https://learn.microsoft.com/powershell/module/exchange/set-remotedomain).

## The six conditions an automatic reply has to pass

For an external sender to receive an OOF from an EXO mailbox, all of these must be true:

1. The user has Automatic Replies enabled.
2. The current time is within the OOF date range (or no end date).
3. **External replies are enabled** (not just internal — separate toggle).
4. EXO has not already sent an OOF to this sender within the once-per-sender window.
5. The remote domain configuration (`Get-RemoteDomain Default`) permits OOFs to that destination type.
6. No transport rule suppresses the OOF for this message.

A failure on any single condition produces "OOF doesn't work" with no error to the user. The diagnostic is to walk each condition in turn.

## Condition 1-3: The user's settings

```powershell
Connect-ExchangeOnline
Get-MailboxAutoReplyConfiguration -Identity "alice@contoso.com" |
    Format-List Identity, AutoReplyState, StartTime, EndTime,
                ExternalAudience, InternalMessage, ExternalMessage
```

Inspect the output:

- **`AutoReplyState : Enabled`** — OOF is on. If `Disabled`, the user hasn't turned it on.
- **`AutoReplyState : Scheduled`** — OOF is set but waiting for `StartTime` to arrive (or has already passed `EndTime`). Check the dates.
- **`ExternalAudience : None`** — OOF is set to "Reply to my organization only." External senders never receive a reply. Change to `All` (everyone) or `Known` (contacts only).
- **`ExternalMessage` is empty** — even if `ExternalAudience` is `All`, an empty external message produces no reply. Set it.

The `ExternalAudience` setting is the most common single cause. Outlook's OOF dialog has two separate tabs (Inside My Organization, Outside My Organization). Users often configure the inside one and don't realise the outside one is a separate toggle.

> [!IMPORTANT]
> `ExternalAudience : Known` means OOFs only go to senders in the user's Contacts. For a sales-facing role this is almost certainly not what they want. Default to `All` for customer-facing accounts.

## Condition 4: The once-per-sender window

EXO sends an automatic reply to a given sender *once* per OOF activation, not on every message. If the same external sender emails three times in a day, they get one OOF. This is a documented anti-spam-loop behaviour and you can't change it on a per-mailbox basis.

What this means in practice: if a sender complains that they "should have gotten an OOF and didn't," they probably *did* get one — earlier in the day, possibly to a different recipient address that hit a transport rule, possibly to a spam folder. Check the recipient's spam folder before assuming OOF is broken.

A useful diagnostic: send a fresh test from an account that has *never* emailed this mailbox before (e.g. a personal Gmail you've never used). If that produces an OOF, the per-sender cache is the explanation for the original complaint.

## Condition 5: The remote domain configuration

This is the trap that catches tenants who have customised their tenant defaults. Exchange Online has a per-remote-domain setting that controls whether OOFs leave the tenant at all, and what *kind* of OOF gets sent.

```powershell
Get-RemoteDomain | Format-Table Name, DomainName, AutoReplyEnabled, AllowedOOFType
```

The defaults you want for normal operation:

- **Default remote domain** (`*`): `AutoReplyEnabled : True`, `AllowedOOFType : External`.

If `AutoReplyEnabled : False`, no OOF leaves the tenant for that destination. This is sometimes set during data-exfiltration concerns (OOFs can leak personal information) and then forgotten. The fix:

```powershell
Set-RemoteDomain -Identity Default -AutoReplyEnabled $true -AllowedOOFType External
```

If `AllowedOOFType : InternalLegacy`, EXO sends a reply that's formatted for on-prem Exchange compatibility and is sometimes dropped by modern external mail systems. `External` is the right value for cloud-only tenants.

> [!WARNING]
> Some compliance frameworks recommend disabling external OOF replies to limit information leakage about staff schedules. If your tenant has done this intentionally, document it — and consider an exception for customer-facing groups via a per-domain remote-domain entry.

## Condition 6: Transport rules that suppress OOFs

Mail flow rules can match on `MessageType : AutoReply` or `MessageType : OutOfOffice` and take actions including delete or quarantine. If someone built a rule to "block auto-replies to certain external domains" (common in finance/legal tenants), check whether that rule is matching unintentionally:

```powershell
Get-TransportRule |
    Where-Object { $_.MessageTypeMatches -match "AutoReply|OutOfOffice" -or
                   $_.SubjectContainsWords -match "Out of Office" -or
                   $_.SubjectMatchesPatterns -match "Automatic Reply" } |
    Select-Object Name, State, Description
```

Review any matches. The rule may be doing what was intended at the time but no longer matches policy.

## A weekly proactive check

Most "OOF doesn't work" tickets come from users who set OOF months ago and forget about the configuration. Find users who have OOF currently *enabled* but whose `ExternalAudience` is `None` or whose `ExternalMessage` is empty — these will silently fail to send the external reply they probably meant to:

```powershell
Connect-ExchangeOnline
$users = Get-Mailbox -RecipientTypeDetails UserMailbox -ResultSize Unlimited
$problematic = foreach ($u in $users) {
    $oof = Get-MailboxAutoReplyConfiguration -Identity $u.Identity
    if ($oof.AutoReplyState -eq "Enabled" -and
        ($oof.ExternalAudience -eq "None" -or [string]::IsNullOrWhiteSpace($oof.ExternalMessage))) {
        [pscustomobject]@{
            User              = $u.PrimarySmtpAddress
            State             = $oof.AutoReplyState
            ExternalAudience  = $oof.ExternalAudience
            HasExternalMessage= -not [string]::IsNullOrWhiteSpace($oof.ExternalMessage)
        }
    }
}
$problematic | Export-Csv oof-misconfigured.csv -NoTypeInformation
```

Send the resulting list to a manager-targeted email so the affected users can fix their own settings before they go on PTO.

## The journaling and Defender for Office 365 interaction

If your tenant has journaling rules or Microsoft Defender for Office 365 transport rules with "redirect to" actions, OOF replies can sometimes be redirected unexpectedly. Symptom: the OOF leaves the user's mailbox (visible in `Get-MessageTrace`) but the external sender never receives it because the redirect intercepted it.

```powershell
Get-MessageTrace -SenderAddress "alice@contoso.com" `
    -StartDate (Get-Date).AddDays(-3) -EndDate (Get-Date) |
    Where-Object Subject -like "Automatic reply*" |
    Format-Table Received, RecipientAddress, Status, FromIP, ToIP
```

If `Status` is `Delivered` and the recipient address looks correct, the OOF did leave. If the recipient still says they didn't get it, the cause is at the recipient's side (spam filter, mail rule). If `Status` is `Failed` or the recipient looks wrong, you have a journaling or redirect issue to investigate.

## Common questions

### Does OOF work for shared mailbox addresses?

Yes — shared mailboxes have their own `AutoReplyConfiguration` and can have OOF turned on independently. Useful for "team@contoso.com" replies during a team-wide event.

### Why didn't the sender receive my OOF — they're a contact?

Verify `ExternalAudience` isn't `None` and check the recipient's spam folder. If both are clean, run `Get-MessageTrace` to confirm the OOF actually left the tenant. Per-sender once-per-OOF caching also applies.

### Can I send the OOF immediately to test it?

There's no "send OOF now" cmdlet. The workaround is: turn OOF off, then immediately back on (this resets the per-sender cache), then have someone send the test mail.

### Does OOF send replies to mailing list subscriptions?

By default, yes — which is one of the reasons the per-sender once-only rule exists. Some mailing list managers filter OOF replies based on the `Auto-Submitted: auto-replied` header that Exchange Online adds, but not all do. This is the source of "the user replied to every message on the mailing list" complaints; the fix is the recipient's mailing list software, not EXO.

### Can I have OOF only for certain dates / certain days of the week?

Date ranges yes (`StartTime` and `EndTime`). Per-day-of-week conditional OOF isn't a built-in feature; you'd implement it with a scheduled script that calls `Set-MailboxAutoReplyConfiguration` on a Power Automate / Azure Function schedule.

### What about Microsoft 365 Group inboxes?

`Set-UnifiedGroup` exposes `AutoSubscribeNewMembers` but Microsoft 365 Groups don't have a per-group OOF. If you want OOF behaviour for a Group's inbox, it's usually managed via a regular shared mailbox in front of the Group.

## What to take away

Out of Office failures almost always trace to one of three places: the user only configured the *internal* reply tab, the tenant's default remote domain has `AutoReplyEnabled : False`, or a transport rule is intercepting `MessageType : AutoReply` mail. The six-condition check resolves it deterministically. The weekly misconfigured-OOF report catches the user who set OOF wrong months ago and is about to leave for vacation tomorrow.

## References

- [Configure Automatic Replies — Microsoft Learn](https://learn.microsoft.com/exchange/recipients-in-exchange-online/manage-user-mailboxes/configure-automatic-replies-for-a-user-mailbox)
- [Set-MailboxAutoReplyConfiguration — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/set-mailboxautoreplyconfiguration)
- [Get-RemoteDomain — Microsoft Learn](https://learn.microsoft.com/powershell/module/exchange/get-remotedomain)
- [Mail flow rules — Microsoft Learn](https://learn.microsoft.com/exchange/security-and-compliance/mail-flow-rules/mail-flow-rules)
- [Message trace in EXO — Microsoft Learn](https://learn.microsoft.com/exchange/monitoring/trace-an-email-message/trace-an-email-message)
