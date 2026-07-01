---
title: "A Minimum-Viable Windows Server Home Lab for Practising Active Directory"
excerpt: "You've read the Microsoft docs. You've watched the videos. It hasn't stuck. The reason it hasn't stuck is that Active Directory is a hands-on discipline and reading about it is not the same as breaking and fixing it yourself. Here's the smallest useful home lab that will let you actually practise — hardware, software, topology, and the first ten exercises to run through."
coverImage: "/assets/blog/home-lab-ad/diagram.svg"
date: "2026-07-01T18:00:00.000Z"
author:
  name: "MU.A"
ogImage:
  url: "/assets/blog/home-lab-ad/diagram.svg"
---

<aside class="callout callout-note" role="note"><p class="callout-label">Affiliate disclosure</p><div class="callout-body"><p>This post contains affiliate links to Amazon. If you buy hardware through one of these links, this site earns a small referral commission at no extra cost to you. Product recommendations reflect what I would actually put in a home lab today — the affiliate relationship doesn't change the picks. See the <a href="/affiliate-disclosure">affiliate disclosure page</a> for the full policy.</p></div></aside>

There's a phase of learning Active Directory where you can quote the difference between a forest and a domain, name the five FSMO roles, describe how replication works between sites, and still fail to actually build a working two-domain lab because you've never done it. Every mid-career identity engineer who's honest about how they learned will tell you the moment it clicked was the moment they broke something in a lab, spent a weekend fixing it, and never forgot how it worked afterwards.

You need a lab. Not a datacentre — a lab. The good news is that in 2026 a genuinely useful Windows Server lab costs roughly one month of a junior admin's grocery budget and fits on the corner of a desk. This post is a walk through the minimum viable setup: what hardware to buy, what software to run, what topology to build, and — most importantly — what to actually *do* with it once it's running.

## Where the lab fits in what you're trying to learn

Before spending money it's worth being honest about what a home lab is for. It's not a production environment, it's not a place to test the exact configuration you'll run at work, and it won't perfectly mimic the enterprise scenarios you'll hit in the field. What it *is* good for:

- **Practising cert-exam material with your hands, not just your eyes.** AZ-800 (Windows Server hybrid administrator), AZ-801 (Windows Server hybrid advanced services), and the MD-102 / MS-102 track all have practical elements that studying alone won't teach. Building a two-DC forest, promoting a member server to a DC, seizing FSMO roles when a DC dies — these are things you have to do once with your own hands.
- **Career-changing into IT or MSP work.** If you're moving from helpdesk into a junior sysadmin or MSP role, a home lab you can talk about in an interview beats every certificate you don't have. "I built a two-domain forest and practised recovering it after simulating a DC failure" is a real answer to "what have you built."
- **Trying dangerous things safely.** Group Policy that locks users out. AD replication break-fix. Restoring System State after a corruption. You can practise these once at home for the cost of clicking Revert on a snapshot; practising them the first time in production is a career-limiting move.
- **Prep before a specific engagement.** You're about to deploy Entra Connect for a client and haven't done it before. Build a small lab that mirrors their basic shape (one on-prem DC, one Entra tenant), practise the install and troubleshoot the sync failures you'll inevitably hit. Two evenings of lab time pays for itself before you touch their tenant.

If your goal isn't one of those, you probably don't need a lab. You need a paid Azure sandbox subscription or a Microsoft Learn Sandbox. Both are cheaper and require no hardware.

## Vocabulary you need before buying hardware

A few terms come up repeatedly in home-lab discussions. If they're new, spend a minute on each before deciding what to buy.

**Type 1 vs Type 2 hypervisor.** A hypervisor is the software that runs virtual machines. A **Type 1** hypervisor runs on bare metal (no OS underneath) — VMware ESXi, Proxmox, XCP-ng, Microsoft Hyper-V Server. A **Type 2** hypervisor runs as an app inside a normal desktop OS — VMware Workstation, VirtualBox, Hyper-V (the client feature, not the server product). Type 1 is what production runs on. Type 2 is fine for a lab and much simpler to set up.

**Nested virtualisation.** Running a hypervisor inside a VM. This matters if you want to test Hyper-V-on-Hyper-V scenarios or run a Kubernetes cluster inside your lab. Nested requires a CPU that supports it (all recent Intel and AMD chips do) and adds a small performance overhead.

**Virtual switch types.** In Hyper-V terminology: **External** (bridged to a physical NIC, VMs get their own IPs on your home LAN), **Internal** (VMs can talk to each other and to the host but not to the physical network), **Private** (VMs can talk only to each other). For most AD lab work you want a single Internal switch so the lab is isolated from your home network but the host can still reach it for RDP.

**Snapshots vs checkpoints.** Same thing, different names. Hyper-V calls them checkpoints, VMware and Proxmox call them snapshots. A point-in-time copy of a VM you can revert to. **The single most important lab feature.** Take one before every risky change and you can experiment without fear.

**Evaluation vs licensed.** Microsoft ships free evaluation editions of Windows Server and Windows client that expire after 180 days (server) or 90 days (client) and can be re-armed a few times. For a lab these are legally fine to use. For production you need licences.

**Datacenter vs Standard.** Windows Server edition choice. For a lab, either is fine — the differences are around VM licensing rights and features like Storage Spaces Direct that don't matter for AD practice.

## Hardware: three price tiers

The right amount to spend depends on how much you'll actually use the lab and what else you want it to do. I'll describe three tiers; any of them will run a functional AD lab.

### Tier 1: Refurbished business desktop, ~CAD $250–400

The cheapest respectable option. A refurbished Dell Optiplex 5060/7060, Lenovo ThinkCentre M720q, or HP EliteDesk 800 G5 from 2019–2021 gives you an Intel i5 or i7 with 8–16 GB of RAM and a small SSD. Add a 32 GB RAM kit and you have a machine that will run four small Windows Server VMs comfortably.

Amazon regularly stocks refurbished SFF (small form factor) business desktops in this range. Look for:

- Intel i5-8500 or i7-8700 (or later) — enough cores for 4–6 VMs
- 16 GB RAM stock, ideally with 2 SODIMM or DIMM slots so you can upgrade to 32 GB
- 256 GB NVMe SSD (bigger is better; you'll want at least 500 GB total)
- USB-C or DisplayPort output

Where this shape breaks down: no Wi-Fi built in on most models (fine — put it on Ethernet), older CPUs may lack certain nested-virt features, and you're at the mercy of the refurbisher's warranty (usually 90 days).

### Tier 2: Modern mini PC, ~CAD $500–700 (the sweet spot)

Where I'd actually start. A Beelink or Minisforum mini PC with a current-generation Ryzen 7 or Intel Core Ultra 5, 32 GB of RAM already installed, and a 500 GB or 1 TB NVMe SSD. Roughly the size of a paperback book, silent under normal load, and enough grunt to run eight VMs.

<a href="https://www.amazon.ca/dp/B0CQVBBQY5?tag=sentinelident-20" rel="sponsored nofollow noopener" target="_blank">Beelink SER8 mini PC on Amazon.ca</a> is one commonly-recommended pick in this range as of mid-2026 — Ryzen 7 8845HS, 32 GB DDR5, 1 TB NVMe, dual 2.5 GbE ports which matters if you want to segment lab traffic.

Look for:

- Ryzen 7 or Intel Core Ultra 5/7 with at least 8 physical cores
- 32 GB RAM (higher is better if you can afford it — 64 GB opens up serious multi-VM work)
- 1 TB NVMe SSD minimum
- Dual Ethernet ports if you want to practise VLANs and Hyper-V external switches on a separate NIC

Where this shape breaks down: proprietary case, so upgrade options are limited to RAM and one internal SSD. If you eventually want to move to Proxmox with ZFS and multiple drives, you'll have hit a ceiling.

### Tier 3: Tower or micro-server, CAD $1,000+

A proper mini tower — either a custom-built PC with a mid-range Ryzen and 64 GB RAM, or a used Dell PowerEdge T30/T40, HP ProLiant MicroServer Gen 10 Plus. Adds room for multiple drives (bulk storage, ZFS mirrors), a real PCIe slot (10 GbE NICs, if you're going that far), and enough thermal headroom to run everything you might want.

Only worth it if you know you'll use the lab hard — running Kubernetes alongside a Windows domain, doing Exchange test deployments, testing Configuration Manager. For AD-only learning, Tier 2 is enough forever.

## Supporting hardware

Regardless of tier, three cheap add-ons make lab life significantly better.

**Extra RAM.** If your machine ships with 16 GB, upgrade to 32 GB before you build the first VM. Windows Server likes 2 GB minimum per VM to feel snappy, and running four VMs at 2 GB each plus the host at 8 GB puts you right at the edge on 16 GB. <a href="https://www.amazon.ca/dp/B08C4V8FYX?tag=sentinelident-20" rel="sponsored nofollow noopener" target="_blank">Crucial 32 GB DDR4 SODIMM kit on Amazon.ca</a> is the safe pick for most 2020-era mini PCs and business desktops. Confirm DDR4 vs DDR5 before ordering — a DDR5 mini PC needs a DDR5 kit.

**External SSD for VM storage or backups.** A 1 TB portable NVMe SSD gives you room to store VM exports, keep a golden Windows Server image, or move a VM between hosts. <a href="https://www.amazon.ca/dp/B08GJH3D18?tag=sentinelident-20" rel="sponsored nofollow noopener" target="_blank">Samsung T7 portable SSD on Amazon.ca</a> is the default recommendation — small, fast, USB-C.

**USB-C hub / dock.** Only if the mini PC's port layout doesn't match your peripherals. Nothing exotic needed.

You do not need: a monitor (RDP from your laptop into the host once initial setup is done), a keyboard and mouse (same reason), a UPS (nice to have, not required), or a switch (the host's onboard NIC is enough for internal lab traffic).

## The software stack

The choice most people agonise over. Here's the honest version.

**Windows 11 Pro + Hyper-V feature enabled** is the simplest option and what I recommend for a first lab. Hyper-V is built into Windows 11 Pro, works well, and lets you use the host's normal Windows tools for everything outside the lab. Downsides: you're running a Type 2 hypervisor, so you're sharing the host CPU with whatever else Windows is doing, and you can't easily rebuild the host without disrupting the lab.

**Proxmox VE** is the free open-source Type 1 option that's become the default in the home lab community over the last few years. Runs on bare metal, has a good web UI, supports ZFS out of the box, and gives you snapshots and clustering for free. Downsides: steeper learning curve, less Windows-friendly (though Windows VMs run fine), and you can't use the host as a general-purpose desktop.

**VMware ESXi Free** used to be the standard recommendation. As of the Broadcom acquisition it's no longer really "free" in a useful sense for new lab builders, so skip it.

Recommendation: **Windows 11 Pro + Hyper-V** for your first lab. Once you know what you actually need, move to Proxmox on a second host if you want to.

For the guest operating systems, download the free evaluation editions from Microsoft:

- **Windows Server 2025 (or 2022) evaluation** — 180-day trial, [Microsoft Evaluation Center](https://www.microsoft.com/en-us/evalcenter/download-windows-server-2025)
- **Windows 11 Enterprise evaluation** — 90-day trial, same site
- Optional: **SQL Server 2022 Developer edition** — free for non-production use

## The topology

The smallest useful AD lab is four VMs. If your host has 16 GB of RAM you can run all four at once with room to spare.

| VM | Purpose | RAM | Disk |
| --- | --- | --- | --- |
| DC01 | Primary domain controller for `lab.local` | 2 GB | 60 GB |
| FS01 | Member file server, joined to the domain | 2 GB | 60 GB |
| CLIENT01 | Windows 11 domain-joined client | 4 GB | 60 GB |
| ROUTER01 (optional) | Windows Server as a router / RRAS / small DHCP | 1 GB | 40 GB |

The router VM is optional — you can use your Hyper-V internal switch with static addressing for a first lab. Add ROUTER01 later when you want to practise DHCP scopes, DNS forwarders on a real router, and multi-subnet routing.

Networking:

- Create one Hyper-V **Internal** switch called `LabSwitch`.
- Give each VM one NIC on `LabSwitch`.
- Assign static IPs in `10.10.0.0/24`. DC01 = `10.10.0.10`, FS01 = `10.10.0.20`, CLIENT01 = `10.10.0.30`.
- DC01 runs DNS. Point every VM at `10.10.0.10` as its DNS server.

## The first ten things to actually practise

The hardware and the topology are the easy part. Here's what to do next — a rough learning path for someone who wants to move from "I've read about AD" to "I've built one."

1. **Promote DC01 to a domain controller.** Install AD DS role, run `dcpromo` / `Install-ADDSForest`, create the forest `lab.local`. Then break something on purpose: restart DC01 mid-promotion and see what recovery looks like.
2. **Create the OU structure.** Root OUs for `Users`, `Groups`, `Servers`, `Workstations`. Put CLIENT01's computer object in the right OU when you join it.
3. **Join CLIENT01 to the domain.** Configure DNS on the client first (point it at DC01), then join. This is where DNS misconfiguration will bite you if you skip step 1's networking.
4. **Create a Group Policy that changes something visible.** Deploy a mapped drive to `\\FS01\Users`. Confirm it applies to CLIENT01 after `gpupdate /force`. Now break it — remove permissions on the share — and watch what the client actually sees.
5. **Add a second DC and promote it into the same domain.** Requires a second VM (DC02). Confirm replication with `repadmin /replsummary`. Break replication by disconnecting DC02's NIC for a day, reconnect it, and watch it recover.
6. **Practise FSMO role transfer and seizure.** Move the PDC Emulator from DC01 to DC02 cleanly. Then simulate DC01 failure (shut it down) and seize the remaining FSMO roles on DC02. This is the exercise cert exams love and the one nobody actually practises.
7. **Configure a fine-grained password policy.** Give the `Admins` OU a stricter password policy than the domain default. Confirm which policy applies to your admin account.
8. **Set up Windows Admin Center on FS01** and manage the domain from a browser. Not as core as the others but worth knowing.
9. **Install Entra Connect on FS01.** Sync a small set of users to a free Microsoft 365 developer tenant. This is the exercise that bridges from Windows Server AD into the Entra side of the modern stack.
10. **Break the domain deliberately and restore it.** Take a snapshot of DC01. Delete an OU containing users. Restore the OU using Active Directory Recycle Bin (or from a System State backup if the Recycle Bin isn't enabled). Then re-enable the Recycle Bin so it never happens again.

Complete those ten and you know AD better than most working admins who've been doing it for a few years.

## What goes wrong in home labs

**"DNS isn't resolving anything and the domain won't come up."** Nine home lab problems out of ten are DNS. The client's DNS server points at your ISP instead of at DC01. Or DC01 has its own DNS server set to `127.0.0.1` (right) *and* your ISP's DNS as a secondary (wrong, and the reason forwarders exist). Fix client DNS first, then check the DC's own client DNS settings.

**"My VMs are painfully slow."** Almost always memory pressure. Windows Server 2025 with 2 GB RAM is usable; with 1.5 GB it's not. Check the host's committed memory. If you're at 90%+, one VM needs to go or you need more RAM.

**"I revert to a snapshot and now nothing works."** Windows Time Service gets confused by big time jumps. After a snapshot revert on the DC, run `w32tm /resync /force` on all VMs. If that doesn't fix it, restart the netlogon service on the DC and rejoin the client if it's dropped its computer account.

**"The evaluation licence expired."** Re-arm it: `slmgr.vbs /rearm` on a Windows Server evaluation. You get a limited number of re-arms; when they're gone, rebuild the VM from the evaluation ISO. Keep a fresh sysprepped image for exactly this reason.

**"I can't RDP into the domain-joined VMs."** Windows Firewall by default doesn't allow RDP on domain-joined machines unless GPO says so. Deploy a small GPO to allow RDP from the host subnet. Or connect via the Hyper-V console — slower but always works.

**"Hyper-V won't start on a Windows 11 host."** Virtualisation is disabled in the UEFI. Reboot into UEFI settings and enable Intel VT-x or AMD-V (labelled SVM on AMD boards). Also enable IOMMU if you want to use device passthrough later.

## FAQ

**Should I just use Azure instead?**
For pure AD practice, no — a local lab is faster to iterate on, has no per-hour cost, and doesn't force you into Microsoft's networking model. Azure is the right complement once you know AD and want to practise hybrid identity. Buy a mini PC *and* set up a free Microsoft 365 developer tenant for the Entra side.

**What about Windows Server on my laptop?**
Fine as a starting point if the laptop has 16+ GB of RAM and doesn't get taken out of the house often. You'll find that once you're serious about labbing, you'll want a dedicated machine so the lab isn't disrupted by your day job.

**Do I need TrueNAS or a proper NAS for storage?**
No. Home lab guides love NAS. For AD practice specifically, the local NVMe on your host is plenty. Add a NAS if you want to practise things like SMB file shares against a Linux backend or iSCSI targets.

**Can I run this on a Mac?**
Yes. Parallels or VMware Fusion on Apple Silicon runs Windows Server ARM64 well. The catch is that Windows Server ARM64 is technically still in preview and some features (Hyper-V nested virt, certain AD features) may not behave identically to x64. It works fine for basic AD lab work.

**How much power does this use?**
A Tier 2 mini PC idles around 8–12 W and peaks around 40–60 W under load. Roughly the same as a laptop. Running 24/7 costs about $2–5 CAD per month depending on your electricity rate.

**Should I put Domain Controllers on the same subnet as my home LAN?**
No. Keep the lab entirely isolated on an Internal virtual switch. You do not want your lab's DHCP scope handing out addresses to your family's phones, and you don't want a rogue lab machine talking to your production home devices.

## References

- Microsoft: [Install Active Directory Domain Services](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-active-directory-domain-services)
- Microsoft Evaluation Center: [Windows Server evaluation ISOs](https://www.microsoft.com/en-us/evalcenter/)
- Microsoft: [Microsoft 365 Developer Program](https://developer.microsoft.com/en-us/microsoft-365/dev-program) — free E5 tenant for testing Entra Connect
- Proxmox VE: [Documentation](https://pve.proxmox.com/pve-docs/)

*Product prices and specifications are current as of the date of publication and subject to change.*
