import { db } from "../src/lib/db";

async function main() {
  // ---- Business Units ----
  const wp = await db.businessUnit.create({ data: { name: "Waterproofing Services", code: "WP" } });
  const chem = await db.businessUnit.create({ data: { name: "Chemical Trading", code: "CHEM" } });
  const lpg = await db.businessUnit.create({ data: { name: "LPG Management", code: "LPG" } });

  // ---- Users ----
  const admin = await db.user.create({ data: { fullName: "Sarah Chen", email: "admin@stockco.com", role: "ADMIN", phone: "+65 9001 1001" } });
  const supervisor = await db.user.create({ data: { fullName: "Marcus Reyes", email: "supervisor@stockco.com", role: "WAREHOUSE_SUPERVISOR", phone: "+65 9001 1002" } });
  const clerk = await db.user.create({ data: { fullName: "Priya Nair", email: "clerk@stockco.com", role: "STOCK_CLERK", phone: "+65 9001 1003" } });
  const engineer = await db.user.create({ data: { fullName: "David Ong", email: "engineer@stockco.com", role: "PROJECT_ENGINEER", phone: "+65 9001 1004" } });
  const viewer = await db.user.create({ data: { fullName: "Lina Tan", email: "viewer@stockco.com", role: "VIEWER", phone: "+65 9001 1005" } });

  // ---- Locations ----
  const mainWh = await db.location.create({ data: { name: "Main Central Warehouse", type: "WAREHOUSE", address: "12 Tuas Avenue, Singapore 638920", isActive: true } });
  const chemWh = await db.location.create({ data: { name: "Chemical Store (Bonded)", type: "WAREHOUSE", businessUnitId: chem.id, address: "8 Jurong Island, Singapore 627890" } });
  const lpgYard = await db.location.create({ data: { name: "LPG Cylinder Yard", type: "WAREHOUSE", businessUnitId: lpg.id, address: "45 Senoko Drive, Singapore 758200" } });

  const site1 = await db.location.create({ data: { name: "Marina One Tower B - Roof Deck", type: "PROJECT_SITE", address: "5 Straits View, Singapore 018935" } });
  const site2 = await db.location.create({ data: { name: "Punggol Digital District - Basement", type: "PROJECT_SITE", address: "PDD Sector 3, Singapore 828888" } });
  const site3 = await db.location.create({ data: { name: "Changi Biz Park - Level 4 Plant Room", type: "PROJECT_SITE", address: "Changi Business Park, Singapore 486032" } });

  const truck1 = await db.location.create({ data: { name: "Service Truck ST-07", type: "VEHICLE" } });
  const truck2 = await db.location.create({ data: { name: "Service Truck ST-12", type: "VEHICLE" } });

  const sup1 = await db.location.create({ data: { name: "BASF South East Asia", type: "SUPPLIER", address: "7 International Business Park, Singapore 609919" } });
  const sup2 = await db.location.create({ data: { name: "Sika Singapore Pte Ltd", type: "SUPPLIER", address: "28 Tuas South Avenue 2, Singapore 637424" } });
  const sup3 = await db.location.create({ data: { name: "MegaLPG Pte Ltd", type: "SUPPLIER", address: "9 Penjuru Road, Singapore 609198" } });

  // ---- Item Categories ----
  const catTool = await db.itemCategory.create({ data: { name: "Tool", trackingMode: "SERIALIZED" } });
  const catEquip = await db.itemCategory.create({ data: { name: "Equipment", trackingMode: "SERIALIZED" } });
  const catCons = await db.itemCategory.create({ data: { name: "Consumable", trackingMode: "BATCH" } });
  const catMat = await db.itemCategory.create({ data: { name: "Material", trackingMode: "BATCH" } });
  const catChem = await db.itemCategory.create({ data: { name: "Chemical", trackingMode: "BATCH" } });
  const catLPG = await db.itemCategory.create({ data: { name: "LPG Cylinder", trackingMode: "SERIALIZED" } });

  // ---- Items (Waterproofing) ----
  const itemMembrane = await db.item.create({ data: { businessUnitId: wp.id, categoryId: catMat.id, sku: "WP-MEM-001", name: "Sikaproof Membrane Roll (2m x 20m)", unitOfMeasure: "roll", unitCost: 420.5, reorderLevel: 8, attributes: JSON.stringify({ color: "black", thickness: "1.5mm" }) } });
  const itemPrimer = await db.item.create({ data: { businessUnitId: wp.id, categoryId: catChem.id, sku: "WP-PRM-002", name: "Sika Primer-3N (5L)", unitOfMeasure: "liters", unitCost: 78.0, reorderLevel: 20, attributes: JSON.stringify({ hazardClass: "Class 3 Flammable", msdsUrl: "https://example.com/msds/3n.pdf" }) } });
  const itemInjector = await db.item.create({ data: { businessUnitId: wp.id, categoryId: catTool.id, sku: "WP-TOL-101", name: "Polyurethane Injection Gun", unitOfMeasure: "pcs", unitCost: 650.0, reorderLevel: 3 } });
  const itemTorch = await db.item.create({ data: { businessUnitId: wp.id, categoryId: catTool.id, sku: "WP-TOL-102", name: "LPG Roofing Torch Kit", unitOfMeasure: "set", unitCost: 280.0, reorderLevel: 4 } });

  // ---- Items (Chemical Trading) ----
  const itemEpoxy = await db.item.create({ data: { businessUnitId: chem.id, categoryId: catChem.id, sku: "CHEM-EPX-001", name: "Epoxy Resin Base (20kg)", unitOfMeasure: "kg", unitCost: 9.5, reorderLevel: 50, attributes: JSON.stringify({ hazardClass: "Irritant", shelfLifeMonths: 12 }) } });
  const itemHardener = await db.item.create({ data: { businessUnitId: chem.id, categoryId: catChem.id, sku: "CHEM-HRD-002", name: "Epoxy Hardener (5kg)", unitOfMeasure: "kg", unitCost: 18.0, reorderLevel: 30, attributes: JSON.stringify({ hazardClass: "Corrosive", shelfLifeMonths: 12 }) } });

  // ---- Items (LPG) ----
  const itemCyl11 = await db.item.create({ data: { businessUnitId: lpg.id, categoryId: catLPG.id, sku: "LPG-CYL-011", name: "LPG Cylinder 11kg (DOT-4BA)", unitOfMeasure: "pcs", unitCost: 95.0, reorderLevel: 10 } });
  const itemCyl50 = await db.item.create({ data: { businessUnitId: lpg.id, categoryId: catLPG.id, sku: "LPG-CYL-050", name: "LPG Cylinder 50kg (Industrial)", unitOfMeasure: "pcs", unitCost: 220.0, reorderLevel: 6 } });

  // ---- Serialized item units (tools + cylinders) ----
  const units = [
    { item: itemInjector, serial: "INJ-2024-0001", qr: "WP-TOL-00481", loc: mainWh, status: "AVAILABLE" },
    { item: itemInjector, serial: "INJ-2024-0002", qr: "WP-TOL-00482", loc: site1, status: "IN_USE" },
    { item: itemInjector, serial: "INJ-2024-0003", qr: "WP-TOL-00483", loc: truck1, status: "IN_USE" },
    { item: itemTorch, serial: "TOR-2024-0001", qr: "WP-TOL-00491", loc: mainWh, status: "AVAILABLE" },
    { item: itemTorch, serial: "TOR-2024-0002", qr: "WP-TOL-00492", loc: site1, status: "IN_USE" },
    { item: itemTorch, serial: "TOR-2024-0003", qr: "WP-TOL-00493", loc: mainWh, status: "UNDER_REPAIR" },
  ] as const;

  for (const u of units) {
    await db.itemUnit.create({ data: { itemId: u.item.id, serialNo: u.serial, qrCode: u.qr, currentLocationId: u.loc.id, status: u.status, receivedAt: new Date("2024-08-15") } });
  }

  // LPG cylinders (serialized) — a larger set
  for (let i = 1; i <= 18; i++) {
    const tag = String(i).padStart(4, "0");
    const loc = i % 3 === 0 ? lpgYard.id : i % 5 === 0 ? site3.id : i % 7 === 0 ? truck2.id : lpgYard.id;
    await db.itemUnit.create({ data: { itemId: itemCyl11.id, serialNo: `L11-${tag}`, qrCode: `LPG-CYL-11-${tag}`, currentLocationId: loc, status: i === 7 ? "UNDER_REPAIR" : i === 13 ? "LOST" : "AVAILABLE", receivedAt: new Date("2024-09-01"), attributes: JSON.stringify({ lastRefill: "2025-01-15", testDue: "2026-09-01" }) } });
  }
  for (let i = 1; i <= 6; i++) {
    const tag = String(i).padStart(3, "0");
    await db.itemUnit.create({ data: { itemId: itemCyl50.id, serialNo: `L50-${tag}`, qrCode: `LPG-CYL-50-${tag}`, currentLocationId: lpgYard.id, status: "AVAILABLE", receivedAt: new Date("2024-06-20"), attributes: JSON.stringify({ lastRefill: "2025-02-10", testDue: "2027-06-20" }) } });
  }

  // ---- Batch items ----
  const batches = [
    { item: itemMembrane, batchNo: "MEM-2025-A", qr: "BAT-MEM-0001", qty: 25, supplier: sup2, expiry: null },
    { item: itemMembrane, batchNo: "MEM-2025-B", qr: "BAT-MEM-0002", qty: 18, supplier: sup2, expiry: null },
    { item: itemPrimer, batchNo: "PRM-2025-01", qr: "BAT-PRM-0001", qty: 60, supplier: sup2, expiry: new Date("2026-06-30") },
    { item: itemPrimer, batchNo: "PRM-2024-12", qr: "BAT-PRM-0002", qty: 12, supplier: sup2, expiry: new Date("2025-12-30") },
    { item: itemEpoxy, batchNo: "EPX-2025-Q1", qr: "BAT-EPX-0001", qty: 320, supplier: sup1, expiry: new Date("2026-03-30") },
    { item: itemHardener, batchNo: "HRD-2025-Q1", qr: "BAT-HRD-0001", qty: 90, supplier: sup1, expiry: new Date("2026-03-30") },
  ] as const;

  for (const b of batches) {
    await db.itemBatch.create({ data: { itemId: b.item.id, batchNo: b.batchNo, qrCode: b.qr, qtyReceived: b.qty, expiryDate: b.expiry, supplierRef: b.supplier.name, receivedAt: new Date("2025-01-10") } });
  }

  // ---- Projects ----
  const proj1 = await db.project.create({ data: { name: "Marina One Roof Deck Waterproofing", clientName: "Marina One Residences Pte Ltd", siteLocationId: site1.id, serviceType: "Roof Deck Waterproofing", status: "ONGOING", percentComplete: 45, startDate: new Date("2025-01-15"), targetEndDate: new Date("2025-05-30"), budget: 285000 } });
  const proj2 = await db.project.create({ data: { name: "Punggol Digital District - Basement Injection", clientName: "JTC Corporation", siteLocationId: site2.id, serviceType: "Basement Crack Injection", status: "ONGOING", percentComplete: 72, startDate: new Date("2024-11-01"), targetEndDate: new Date("2025-03-15"), budget: 168000 } });
  const proj3 = await db.project.create({ data: { name: "Changi Biz Park LPG Plant Room Upgrade", clientName: "Mapletree", siteLocationId: site3.id, serviceType: "LPG System Upgrade", status: "PLANNING", percentComplete: 5, startDate: new Date("2025-03-01"), targetEndDate: new Date("2025-08-15"), budget: 410000 } });

  await db.projectMilestone.create({ data: { projectId: proj1.id, title: "Surface Prep Complete", targetDate: new Date("2025-02-10"), completedAt: new Date("2025-02-08"), percentWeight: 25 } });
  await db.projectMilestone.create({ data: { projectId: proj1.id, title: "Primer Coat Applied", targetDate: new Date("2025-03-01"), completedAt: new Date("2025-02-28"), percentWeight: 25 } });
  await db.projectMilestone.create({ data: { projectId: proj1.id, title: "Membrane Installation", targetDate: new Date("2025-04-20"), percentWeight: 35 } });
  await db.projectMilestone.create({ data: { projectId: proj1.id, title: "Final Inspection", targetDate: new Date("2025-05-25"), percentWeight: 15 } });

  // ---- Stock Transactions (the ledger) ----
  // RECEIPT — batch received into main warehouse
  await db.stockTransaction.create({ data: { transactionType: "RECEIPT", itemBatchId: (await db.itemBatch.findFirst({ where: { qrCode: "BAT-MEM-0001" } }))!.id, itemId: itemMembrane.id, quantity: 25, fromLocationId: sup2.id, toLocationId: mainWh.id, status: "COMPLETED", requestedById: clerk.id, approvedById: supervisor.id, approvedAt: new Date("2025-01-10"), qrScannedAt: new Date("2025-01-10T09:20:00"), scannedById: clerk.id, notes: "Goods received in good condition", createdAt: new Date("2025-01-10T09:15:00") } });

  await db.stockTransaction.create({ data: { transactionType: "RECEIPT", itemBatchId: (await db.itemBatch.findFirst({ where: { qrCode: "BAT-PRM-0001" } }))!.id, itemId: itemPrimer.id, quantity: 60, fromLocationId: sup2.id, toLocationId: mainWh.id, status: "COMPLETED", requestedById: clerk.id, approvedById: supervisor.id, approvedAt: new Date("2025-01-10"), qrScannedAt: new Date("2025-01-10T09:30:00"), scannedById: clerk.id, createdAt: new Date("2025-01-10T09:25:00") } });

  // DELIVERY — to project site (completed)
  await db.stockTransaction.create({ data: { transactionType: "DELIVERY", itemUnitId: (await db.itemUnit.findFirst({ where: { qrCode: "WP-TOL-00482" } }))!.id, itemId: itemInjector.id, fromLocationId: mainWh.id, toLocationId: site1.id, projectId: proj1.id, status: "COMPLETED", requestedById: engineer.id, approvedById: supervisor.id, approvedAt: new Date("2025-01-20"), qrScannedAt: new Date("2025-01-20T10:00:00"), scannedById: clerk.id, notes: "Delivered to Marina One site", createdAt: new Date("2025-01-19T14:00:00") } });

  await db.stockTransaction.create({ data: { transactionType: "DELIVERY", itemBatchId: (await db.itemBatch.findFirst({ where: { qrCode: "BAT-MEM-0001" } }))!.id, itemId: itemMembrane.id, quantity: 8, fromLocationId: mainWh.id, toLocationId: site1.id, projectId: proj1.id, status: "COMPLETED", requestedById: engineer.id, approvedById: supervisor.id, approvedAt: new Date("2025-01-22"), qrScannedAt: new Date("2025-01-22T08:45:00"), scannedById: clerk.id, createdAt: new Date("2025-01-21T16:30:00") } });

  // PENDING — approval queue items
  await db.stockTransaction.create({ data: { transactionType: "DELIVERY", itemBatchId: (await db.itemBatch.findFirst({ where: { qrCode: "BAT-PRM-0001" } }))!.id, itemId: itemPrimer.id, quantity: 12, fromLocationId: mainWh.id, toLocationId: site1.id, projectId: proj1.id, status: "PENDING", requestedById: engineer.id, notes: "Needed for next phase of primer coat", createdAt: new Date("2025-02-05T11:20:00") } });

  await db.stockTransaction.create({ data: { transactionType: "TRANSFER", itemUnitId: (await db.itemUnit.findFirst({ where: { qrCode: "WP-TOL-00481" } }))!.id, itemId: itemInjector.id, fromLocationId: mainWh.id, toLocationId: site2.id, projectId: proj2.id, status: "PENDING", requestedById: engineer.id, notes: "Re-allocate injection gun to Punggol basement", createdAt: new Date("2025-02-06T09:10:00") } });

  await db.stockTransaction.create({ data: { transactionType: "PULL_OUT", itemUnitId: (await db.itemUnit.findFirst({ where: { qrCode: "WP-TOL-00493" } }))!.id, itemId: itemTorch.id, fromLocationId: mainWh.id, toLocationId: mainWh.id, status: "PENDING", requestedById: clerk.id, reasonCode: "DAMAGED", notes: "Torch igniter broken — needs repair pull-out", createdAt: new Date("2025-02-06T15:00:00") } });

  await db.stockTransaction.create({ data: { transactionType: "REQUEST", itemBatchId: (await db.itemBatch.findFirst({ where: { qrCode: "BAT-EPX-0001" } }))!.id, itemId: itemEpoxy.id, quantity: 40, fromLocationId: chemWh.id, toLocationId: site2.id, projectId: proj2.id, status: "PENDING", requestedById: engineer.id, notes: "Epoxy required for crack injection at Punggol", createdAt: new Date("2025-02-07T08:30:00") } });

  await db.stockTransaction.create({ data: { transactionType: "DELIVERY", itemUnitId: (await db.itemUnit.findFirst({ where: { qrCode: "LPG-CYL-11-0005" } }))!.id, itemId: itemCyl11.id, fromLocationId: lpgYard.id, toLocationId: site3.id, projectId: proj3.id, status: "PENDING", requestedById: engineer.id, notes: "Cylinders for plant room commissioning", createdAt: new Date("2025-02-07T10:15:00") } });

  // CONSUMPTION — used on site
  await db.stockTransaction.create({ data: { transactionType: "CONSUMPTION", itemBatchId: (await db.itemBatch.findFirst({ where: { qrCode: "BAT-PRM-0001" } }))!.id, itemId: itemPrimer.id, quantity: 15, fromLocationId: site1.id, toLocationId: site1.id, projectId: proj1.id, status: "COMPLETED", requestedById: engineer.id, approvedById: supervisor.id, approvedAt: new Date("2025-02-01"), qrScannedAt: new Date("2025-02-01T14:00:00"), scannedById: clerk.id, notes: "Primer consumed on roof deck phase 1", createdAt: new Date("2025-02-01T13:30:00") } });

  // ADJUSTMENT — count fix
  await db.stockTransaction.create({ data: { transactionType: "ADJUSTMENT", itemBatchId: (await db.itemBatch.findFirst({ where: { qrCode: "BAT-MEM-0002" } }))!.id, itemId: itemMembrane.id, quantity: -2, fromLocationId: mainWh.id, toLocationId: mainWh.id, status: "COMPLETED", requestedById: clerk.id, approvedById: supervisor.id, approvedAt: new Date("2025-01-30"), reasonCode: "COUNT_FIX", notes: "Stock count variance — 2 rolls unaccounted", createdAt: new Date("2025-01-30T17:00:00") } });

  // ---- Service Guides (static reference) ----
  await db.serviceGuide.create({ data: { serviceType: "Roof Deck Waterproofing", description: "Membrane-based waterproofing system for exposed concrete roof decks. Includes surface preparation, primer application, and torch-on membrane installation.", recommendedItems: "- Sikaproof Membrane Roll (WP-MEM-001)\n- Sika Primer-3N 5L (WP-PRM-002)\n- LPG Roofing Torch Kit (WP-TOL-102)\n- Polyurethane Injection Gun (WP-TOL-101) for detail work\n- PPE: heat-resistant gloves, safety boots, eye protection" } });
  await db.serviceGuide.create({ data: { serviceType: "Basement Crack Injection", description: "Polyurethane/Epoxy injection for cracks in below-grade concrete walls and slabs. Stops active water ingress.", recommendedItems: "- Epoxy Resin Base 20kg (CHEM-EPX-001)\n- Epoxy Hardener 5kg (CHEM-HRD-002)\n- Polyurethane Injection Gun (WP-TOL-101)\n- Injection packers\n- Surface seal paste" } });
  await db.serviceGuide.create({ data: { serviceType: "LPG System Upgrade", description: "Replacement and re-commissioning of LPG cylinder banks for commercial plant rooms. Includes cylinder testing and pressure checks.", recommendedItems: "- LPG Cylinder 11kg (LPG-CYL-011) or 50kg (LPG-CYL-050)\n- Regulator and hose assembly\n- Pressure test gauge\n- Gas detector (calibrated)\n- PPE: gas-rated respirator, fire extinguisher on standby" } });
  await db.serviceGuide.create({ data: { serviceType: "Torch-On Membrane Repair", description: "Spot repair of damaged torch-on membrane sections without full re-roofing.", recommendedItems: "- Sikaproof Membrane Roll (WP-MEM-001)\n- Sika Primer-3N 5L (WP-PRM-002)\n- LPG Roofing Torch Kit (WP-TOL-102)\n- Seam roller\n- Cutting knife" } });

  // ---- User Location Access ----
  await db.userLocationAccess.create({ data: { userId: clerk.id, locationId: mainWh.id } });
  await db.userLocationAccess.create({ data: { userId: clerk.id, locationId: chemWh.id } });
  await db.userLocationAccess.create({ data: { userId: clerk.id, locationId: lpgYard.id } });
  await db.userLocationAccess.create({ data: { userId: engineer.id, locationId: site1.id } });
  await db.userLocationAccess.create({ data: { userId: engineer.id, locationId: site2.id } });
  await db.userLocationAccess.create({ data: { userId: engineer.id, locationId: site3.id } });

  console.log("Seed complete:", { businessUnits: 3, users: 5, locations: 10, items: 8, units: 24, batches: 6, projects: 3, transactions: 11, guides: 4 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
