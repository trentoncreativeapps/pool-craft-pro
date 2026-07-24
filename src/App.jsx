import { useState, useMemo, useRef, useEffect, useCallback } from "react";

// ─── AFFILIATE LINKS ──────────────────────────────────────────────────────────
const AFFILIATE_TAGS = { amazon: "YOURTAG-20", homedepot: "YOUR_HD_TAG", lowes: "YOUR_LOWES_TAG", wayfair: "YOUR_WAYFAIR_TAG" };
const hdLink = (q) => `https://www.homedepot.com/s/${encodeURIComponent(q)}?cm_mmc=afl-ir-${AFFILIATE_TAGS.homedepot}`;
const lowesLink = (q) => `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}&affid=${AFFILIATE_TAGS.lowes}`;
const wayfairLink = (q) => `https://www.wayfair.com/keyword.php?keyword=${encodeURIComponent(q)}&refid=${AFFILIATE_TAGS.wayfair}`;
const amazonLink = (asin) => `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAGS.amazon}`;

const FINISH_LINKS = {
  plaster:    { name:"White Plaster Pool Finish 50lb Bag", retailer:"Amazon", link:amazonLink("B07PLASTER1"), earn:"3–8%" },
  pebble:     { name:"Pebble Tec Natural Stone Finish", retailer:"Amazon", link:amazonLink("B07PBTECEF"), earn:"3–8%" },
  quartz:     { name:"Diamond Brite Quartz Pool Finish", retailer:"Home Depot", link:hdLink("diamond brite quartz pool finish"), earn:"2–8%" },
  tile:       { name:"Blue Glass Mosaic Pool Tile 4x4", retailer:"Home Depot", link:hdLink("blue glass mosaic pool tile"), earn:"2–8%" },
  fiberglass: { name:"Fiberglass Pool Gelcoat Repair Kit", retailer:"Amazon", link:amazonLink("B08FGLSKIT"), earn:"3–8%" },
  glass_bead: { name:"Glass Bead Pool Finish Bag", retailer:"Amazon", link:amazonLink("B09GLSBEAD"), earn:"3–8%" },
};
const COLOR_LINKS = {
  arctic:    { name:"Rust-Oleum Pool Paint Arctic White", retailer:"Home Depot", link:hdLink("rustoleum pool paint white"), earn:"2–8%" },
  caribbean: { name:"Pool Paint Caribbean Blue 1gal", retailer:"Lowe's", link:lowesLink("pool paint caribbean blue"), earn:"1–4%" },
  tahoe:     { name:"In The Swim Tahoe Blue Pool Paint", retailer:"Amazon", link:amazonLink("B07TAHOEBL"), earn:"3–8%" },
  midnight:  { name:"Epoxy Pool Paint Midnight Black", retailer:"Amazon", link:amazonLink("B08MIDNPNT"), earn:"3–8%" },
  seafoam:   { name:"Pool Paint Seafoam Green 1gal", retailer:"Home Depot", link:hdLink("pool paint seafoam green"), earn:"2–8%" },
  sandstone: { name:"Sundek Pool Deck Sandstone Coat", retailer:"Amazon", link:amazonLink("B07SNDSTN1"), earn:"3–8%" },
  slate:     { name:"Pool Paint Slate Grey Epoxy", retailer:"Lowe's", link:lowesLink("pool paint slate grey epoxy"), earn:"1–4%" },
  sapphire:  { name:"Pool Paint Sapphire Blue Premium", retailer:"Amazon", link:amazonLink("B09SAPPHIR"), earn:"3–8%" },
};
const ENTRY_LINKS = {
  beach_entry:    { name:"Beach Entry Pool Transition Kit", retailer:"Amazon", link:amazonLink("B07BEACHEK"), earn:"3–8%" },
  baja_shelf:     { name:"Tanning Ledge Lounger (fits Baja shelf)", retailer:"Wayfair", link:wayfairLink("tanning ledge lounger baja shelf pool"), earn:"3–7%" },
  steps_corner:   { name:"Pool Step Handrail Stainless 60in", retailer:"Lowe's", link:lowesLink("pool step handrail stainless 60"), earn:"1–4%" },
  steps_end:      { name:"Pool Entry Step Nosing Tile", retailer:"Home Depot", link:hdLink("pool step nosing tile coping"), earn:"2–8%" },
  steps_curved:   { name:"Roman Step Pool Coping Stone", retailer:"Amazon", link:amazonLink("B07ROMCOPE"), earn:"3–8%" },
  swim_up_bar:    { name:"Outdoor Bar Stools Waterproof Set 4", retailer:"Wayfair", link:wayfairLink("waterproof outdoor bar stools pool"), earn:"3–7%" },
  infinity_edge:  { name:"Infinity Edge Catch Basin Kit", retailer:"Amazon", link:amazonLink("B08INFEDGE"), earn:"3–8%" },
  spa_attached:   { name:"Spa Blower 1.5HP Air Injector", retailer:"Amazon", link:amazonLink("B07SPABLWR"), earn:"3–8%" },
  grotto:         { name:"Natural Fieldstone Rock Kit Waterfall", retailer:"Home Depot", link:hdLink("natural fieldstone waterfall rock kit"), earn:"2–8%" },
  diving_rock:    { name:"Duraflex Diving Board 6ft with Base", retailer:"Amazon", link:amazonLink("B07DIVBRD6"), earn:"3–8%" },
  sun_shelf_umbrella: { name:"9ft Cantilever Pool Umbrella w/ Sleeve", retailer:"Wayfair", link:wayfairLink("cantilever umbrella pool shelf sleeve"), earn:"3–7%" },
  splash_pad:     { name:"Splash Pad Water Play Mat Kids", retailer:"Amazon", link:amazonLink("B09SPLSHPD"), earn:"3–8%" },
};
const HARDSCAPE_LINKS = {
  concrete_deck:   { name:"Quikrete 5000 Concrete Mix 80lb", retailer:"Home Depot", link:hdLink("quikrete 5000 concrete mix 80lb"), earn:"2–8%" },
  travertine:      { name:"Travertine Pool Coping 12x24 Silver", retailer:"Home Depot", link:hdLink("travertine pool coping 12x24"), earn:"2–8%" },
  cool_deck:       { name:"Kool Deck Pool Deck Coating 40lb", retailer:"Amazon", link:amazonLink("B07KOOLDCK"), earn:"3–8%" },
  wood_composite:  { name:"TimberTech Composite Deck Board 16ft", retailer:"Lowe's", link:lowesLink("timbertech composite deck board 16ft"), earn:"1–4%" },
  fire_pit:        { name:"Propane Fire Pit Table 48in Natural Gas", retailer:"Home Depot", link:hdLink("propane fire pit table 48 inch"), earn:"2–8%" },
  fire_bowls:      { name:"Concrete Fire Bowl 30in Propane", retailer:"Amazon", link:amazonLink("B08CONCFBL"), earn:"3–8%" },
  pergola:         { name:"12x12 Cedar Pergola Kit", retailer:"Lowe's", link:lowesLink("12x12 cedar pergola kit"), earn:"1–4%" },
  retaining_wall:  { name:"Versa-Lok Retaining Wall Block", retailer:"Home Depot", link:hdLink("versalok retaining wall block"), earn:"2–8%" },
  outdoor_kitchen: { name:"Stainless Built-In Grill 4-Burner", retailer:"Home Depot", link:hdLink("stainless built-in grill 4 burner outdoor"), earn:"2–8%" },
  landscape_beds:  { name:"Black Landscape Edging 20ft Roll", retailer:"Lowe's", link:lowesLink("black landscape edging 20ft"), earn:"1–4%" },
  fence:           { name:"Pool Safety Fence 4ft x 12ft Panel", retailer:"Amazon", link:amazonLink("B07SAFEFNC"), earn:"3–8%" },
  putting_green:   { name:"Artificial Putting Green Turf 5x10", retailer:"Amazon", link:amazonLink("B09PUTTGRN"), earn:"3–8%" },
  sport_court:     { name:"Sport Court Flooring Tile 20-pack", retailer:"Amazon", link:amazonLink("B08SRTCRTF"), earn:"3–8%" },
  bocce:           { name:"Bocce Ball Set Professional 8-ball", retailer:"Amazon", link:amazonLink("B07BOCCEST"), earn:"3–8%" },
};

const ENTRY_FEATURES = [
  { id:"beach_entry", label:"Beach Entry", icon:"🏖️", desc:"Zero-depth gradual slope entry — resort style", color:"#f59e0b" },
  { id:"baja_shelf", label:"Baja Shelf / Tanning Ledge", icon:"☀️", desc:"Shallow ledge 6-12 inches deep, perfect for loungers", color:"#06b6d4" },
  { id:"steps_corner", label:"Corner Steps", icon:"🔢", desc:"Classic corner entry steps with handrail option", color:"#8b5cf6" },
  { id:"steps_end", label:"End Steps", icon:"⬆️", desc:"Full-width steps at shallow end", color:"#3b82f6" },
  { id:"steps_curved", label:"Curved / Roman Steps", icon:"🔵", desc:"Elegant curved steps — traditional style", color:"#10b981" },
  { id:"swim_up_bar", label:"Swim-Up Bar / Ledge", icon:"🍹", desc:"Raised bar area with seating in the water", color:"#ef4444" },
  { id:"grotto", label:"Grotto / Cave", icon:"🏔️", desc:"Rock waterfall with hidden grotto underneath", color:"#64748b" },
  { id:"infinity_edge", label:"Infinity / Vanishing Edge", icon:"🌊", desc:"Water spills over one edge — luxury statement", color:"#0ea5e9" },
  { id:"spa_attached", label:"Attached Spa / Hot Tub", icon:"🛁", desc:"Spillover spa connected to pool", color:"#a855f7" },
  { id:"splash_pad", label:"Splash Pad Zone", icon:"💦", desc:"Zero-depth play area for kids", color:"#22c55e" },
  { id:"diving_rock", label:"Diving Rock / Board", icon:"🪨", desc:"Natural rock or diving board platform", color:"#f97316" },
  { id:"sun_shelf_umbrella", label:"Sun Shelf w/ Umbrella Sleeve", icon:"⛱️", desc:"Tanning ledge with built-in umbrella socket", color:"#eab308" },
];

const POOL_SHAPES = [
  { id:"rectangle", label:"Rectangle", icon:"▬", desc:"Classic, maximizes swim lanes" },
  { id:"oval", label:"Oval / Kidney", icon:"⬭", desc:"Organic shape, popular residential" },
  { id:"lshape", label:"L-Shape", icon:"⌐", desc:"Separate deep & shallow zones" },
  { id:"freeform", label:"Freeform", icon:"〜", desc:"Custom natural flowing shape" },
  { id:"lap", label:"Lap Pool", icon:"━", desc:"Long & narrow for fitness swimming" },
  { id:"greek", label:"Greek / Roman", icon:"🏛️", desc:"Classic rectangular with curved ends" },
  { id:"figure8", label:"Figure 8", icon:"∞", desc:"Two connected circular areas" },
];
const POOL_FINISHES = [
  { id:"plaster", label:"Plaster", desc:"Classic white, most affordable" },
  { id:"pebble", label:"Pebble Tec", desc:"Durable aggregate, natural look" },
  { id:"quartz", label:"Quartz", desc:"Mid-range, smooth & colorful" },
  { id:"tile", label:"All Tile", desc:"Premium, endless color options" },
  { id:"fiberglass", label:"Fiberglass", desc:"Fastest install, low maintenance" },
  { id:"glass_bead", label:"Glass Bead", desc:"Sparkling luxe finish" },
];
const POOL_COLORS = [
  { id:"arctic", label:"Arctic White", hex:"#e8f4f8" },
  { id:"caribbean", label:"Caribbean Blue", hex:"#0ea5e9" },
  { id:"tahoe", label:"Tahoe Blue", hex:"#1d4ed8" },
  { id:"midnight", label:"Midnight Black", hex:"#1e293b" },
  { id:"seafoam", label:"Seafoam Green", hex:"#34d399" },
  { id:"sandstone", label:"Sandstone", hex:"#d4a76a" },
  { id:"slate", label:"Slate Grey", hex:"#64748b" },
  { id:"sapphire", label:"Sapphire", hex:"#2563eb" },
];
const DEPTHS = [
  { id:"shallow", label:"All Shallow (3-4 ft)", avg:3.5, desc:"Best for families & Baja shelves" },
  { id:"standard", label:"Standard (3.5 / 5 ft)", avg:4.25, desc:"Most common residential" },
  { id:"deep", label:"Standard Deep (3.5 / 6 ft)", avg:4.75, desc:"Better for diving" },
  { id:"diving", label:"Diving (4 / 8 ft)", avg:6, desc:"Required for boards & rocks" },
];
const HARDSCAPE_OPTIONS = [
  { id:"concrete_deck", label:"Concrete Deck", icon:"🪵", unit:"sq ft" },
  { id:"travertine", label:"Travertine Pavers", icon:"🟫", unit:"sq ft" },
  { id:"cool_deck", label:"Kool Deck / Textured", icon:"🔲", unit:"sq ft" },
  { id:"wood_composite", label:"Composite Decking", icon:"🪵", unit:"sq ft" },
  { id:"fire_pit", label:"Fire Pit", icon:"🔥", unit:"unit" },
  { id:"fire_bowls", label:"Fire Bowls", icon:"🏺", unit:"qty" },
  { id:"pergola", label:"Pergola / Shade", icon:"🏠", unit:"unit" },
  { id:"retaining_wall", label:"Retaining Wall", icon:"🧱", unit:"linear ft" },
  { id:"outdoor_kitchen", label:"Outdoor Kitchen", icon:"🍳", unit:"unit" },
  { id:"landscape_beds", label:"Planting Beds", icon:"🌿", unit:"sq ft" },
  { id:"fence", label:"Pool Safety Fence", icon:"🚧", unit:"linear ft" },
  { id:"putting_green", label:"Putting Green", icon:"⛳", unit:"sq ft" },
  { id:"sport_court", label:"Sport Court", icon:"🏀", unit:"sq ft" },
  { id:"bocce", label:"Bocce Ball Court", icon:"🎯", unit:"unit" },
];

const PENTAIR_AMAZON = {
  pump_1_5hp:"B0C3JNRWMN", pump_3hp:"B0CY8RB8Q3", pump_touchscreen:"B0F85WWPRV",
  filter_cc320:"B00004RA8N", filter_triton:"B00004RAQN", filter_fns60:"B00004RB0O",
  heater_250:"B000BKRGX4", heater_400:"B000BKRGY8",
  intellicenter:"B09RKKC13Y", intellibrite:"B01HIOVHGI",
  ic40_cell:"B001DSLLH4", ic40_bundle:"B006H3X33A", chlorinator:"B00004RA7E",
  booster:"B0C3JNRWMN",
};
function pentairLink(asin){ return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAGS.amazon}`; }

function getPentairEquipment(gallons, extras) {
  // Pump sizing: industry standard = turn over pool volume in 8 hours
  // Flow rate needed (GPM) = gallons / 480 minutes
  const gpm = Math.ceil(gallons / 480);
  const pump = gallons <= 15000
    ? { model:"Pentair IntelliFlo3 VSF 1.5HP", sku:"011065", asin:PENTAIR_AMAZON.pump_1_5hp, earn:"3-8%",
        note:`Sized for your ${gallons.toLocaleString()} gal pool. Needs ~${gpm} GPM turnover — this pump delivers 15-140 GPM variable. Wi-Fi + app control. 90% energy savings vs single-speed.` }
    : gallons <= 30000
    ? { model:"Pentair IntelliFlo3 VSF 3HP", sku:"011076", asin:PENTAIR_AMAZON.pump_3hp, earn:"3-8%",
        note:`Your ${gallons.toLocaleString()} gal pool needs ~${gpm} GPM — the 3HP handles up to 30,000 gal comfortably. Built-in I/O relay board for automation integration.` }
    : { model:"Pentair IntelliFlo3 VSF 3HP (×2)", sku:"011076x2", asin:PENTAIR_AMAZON.pump_3hp, earn:"3-8%",
        note:`At ${gallons.toLocaleString()} gal your pool needs ~${gpm} GPM. Two 3HP VSF pumps in parallel deliver the required flow while maintaining efficiency and redundancy.` };

  // Filter sizing: sq ft of filter area should be ≥ (GPM / 0.375) for cartridge
  const filterSqFt = Math.ceil(gpm / 0.375);
  const filter = gallons <= 15000
    ? { model:"Pentair Clean & Clear Plus 320", sku:"160340", asin:PENTAIR_AMAZON.filter_cc320, earn:"3-8%",
        note:`320 sq ft cartridge filter — right-sized for up to 20,000 gal. No backwash needed, easy quarterly cleaning. Holds debris well between cleanings.` }
    : gallons <= 25000
    ? { model:"Pentair Triton II TR-60 Sand", sku:"140210", asin:PENTAIR_AMAZON.filter_triton, earn:"3-8%",
        note:`High-flow sand filter rated for your flow range (~${gpm} GPM). Simple backwash cleaning. Recommended for pools with heavy bather load or nearby trees.` }
    : { model:"Pentair FNS Plus 60 DE Filter", sku:"180010", asin:PENTAIR_AMAZON.filter_fns60, earn:"3-8%",
        note:`60 sq ft DE filter — finest filtration available, down to 3-5 microns. Best water clarity for your ${gallons.toLocaleString()} gal pool. Backwash every 4-6 weeks.` };

  // Heater sizing: BTU needed ≈ surface area × temp rise × 12
  const surfaceArea = Math.round(gallons / (4.25 * 7.48)); // approx sq ft
  const btuNeeded = surfaceArea * 20 * 12; // 20°F rise, 12 BTU/hr/sq ft
  const heater = extras.heater
    ? gallons <= 15000
      ? { model:"Pentair MasterTemp 250K BTU Gas", sku:"460736", asin:PENTAIR_AMAZON.heater_250, earn:"3-8%",
          note:`Your ~${surfaceArea} sq ft pool needs ~${Math.round(btuNeeded/1000)}K BTU. The 250K handles pools up to 15,000 gal efficiently. Heats ~1°F/hr in moderate conditions.` }
      : { model:"Pentair MasterTemp 400K BTU Gas", sku:"460805", asin:PENTAIR_AMAZON.heater_400, earn:"3-8%",
          note:`At ${gallons.toLocaleString()} gal you need high BTU output. The 400K is the industry workhorse — heats your pool in 2-4 hours from cold. Most popular heater in US.` }
    : null;

  const automation = {
    model:"Pentair IntelliCenter i8PS Bundle", sku:"521903", asin:PENTAIR_AMAZON.intellicenter, earn:"3-8%",
    note:`Controls your pump, lights, heater, and salt system from anywhere via the Pentair Home app. Required for full variable-speed pump efficiency programming. Includes IC40 salt cell.`
  };

  const lightQty = gallons <= 20000 ? 1 : gallons <= 40000 ? 2 : 3;
  const lighting = {
    model:`Pentair IntelliBrite 5G Color LED (×${lightQty})`, sku:"640132", asin:PENTAIR_AMAZON.intellibrite, earn:"3-8%",
    qty: lightQty,
    note:`${lightQty} light${lightQty>1?"s":""} recommended for your ${gallons.toLocaleString()} gal pool${lightQty>1?" — one at each end for even coverage":""}. 16M colors, app controlled, 5-yr warranty. 75% less energy than incandescent.`
  };

  const salt = extras.sanitization === "salt"
    ? { model:"Pentair IntelliChlor IC40 + Power Center", sku:"520555+520556", asin:PENTAIR_AMAZON.ic40_bundle, earn:"3-8%",
        note:`IC40 handles up to 40,000 gal — perfect for your ${gallons.toLocaleString()} gal pool. Self-cleaning cell. Included with IntelliCenter bundle above. Eliminates chlorine purchasing.` }
    : { model:"Pentair Rainbow 320 Inline Chlorinator", sku:"R171096", asin:PENTAIR_AMAZON.chlorinator, earn:"3-8%",
        note:`Traditional inline tablet chlorinator. Reliable, simple, low cost to operate. Holds 9 lbs of 3-inch tablets. Good alternative if you prefer not using a salt system.` };

  const boost = extras.waterFeature
    ? { model:"Pentair IntelliFlo VSF Booster Pump", sku:"011065B", asin:PENTAIR_AMAZON.booster, earn:"3-8%",
        note:`Dedicated pump for water features, deck jets, scuppers, or bubblers. Keeps your main pump optimized for filtration while the booster handles feature flow separately.` }
    : null;

  return [
    { label:"🔄 Pump", ...pump },
    { label:"🧹 Filter", ...filter },
    { label:"🎛️ Automation", ...automation },
    { label:"💡 Lighting", ...lighting },
    { label:"🧂 Sanitization", ...salt },
    ...(heater ? [{ label:"🔥 Heater", ...heater }] : []),
    ...(boost  ? [{ label:"💧 Feature Pump", ...boost }] : []),
  ];
}

function calcMaterials(shape,len,wid,depthId,finishId) {
  len = Number.isFinite(len) && len > 0 ? len : 1;
  wid = Number.isFinite(wid) && wid > 0 ? wid : 1;
  const sf={rectangle:1,oval:0.79,lshape:0.75,freeform:0.85,lap:1,greek:1,figure8:0.78}[shape]||1;
  const avgDepth={shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25;
  const footprint=len*wid*sf;
  const gallons=Math.round(footprint*avgDepth*7.48);
  const shell=footprint+2*(len+wid)*avgDepth*sf;
  const STICK_FT=20,SPACING=1;
  const floorBarsLong=Math.ceil((len*sf)/SPACING)+1;
  const floorBarsShort=Math.ceil((wid*sf)/SPACING)+1;
  const floorLinFt=(floorBarsLong*wid*sf)+(floorBarsShort*len*sf);
  const perimFt=2*(len+wid)*sf;
  const wallHorizBars=Math.ceil(avgDepth/SPACING)+1;
  const wallVertBars=Math.ceil(perimFt/SPACING)+1;
  const wallLinFt=(wallHorizBars*perimFt)+(wallVertBars*avgDepth);
  const totalLinFt=Math.round((floorLinFt+wallLinFt)*1.15);
  const totalSticks=Math.ceil(totalLinFt/STICK_FT);
  return {
    gallons,
    excavation:`${Math.round(footprint*avgDepth*1.2/27)} cu yds`,
    gunite:`${Math.round(shell*(4/12)/27)} cu yds`,
    rebar:`${totalSticks.toLocaleString()} sticks (${totalLinFt.toLocaleString()} linear ft)`,
    rebarSticks:totalSticks, rebarLinFt:totalLinFt,
    gravel:`${Math.round(footprint*(4/12)/27*1.5)} tons`,
    plumbing:`${Math.round((len+wid)*2.5)} linear ft`,
    coping:`${Math.round(2*(len+wid)*sf+10)} linear ft`,
    tile:`${Math.round(2*(len+wid)*sf+10)} sq ft`,
    finish:`${Math.round(shell)} sq ft`,
  };
}

const STEP_GUIDE=[
  {phase:"Phase 1",title:"Planning & Permits",icon:"📋",days:"2-4 wks",steps:["Survey property & mark utility lines","Submit permit application to county","Order soil test if required","Finalize pool design & dimensions","Approve equipment & finish selections"]},
  {phase:"Phase 2",title:"Excavation",icon:"🚜",days:"1-3 days",steps:["Mark pool outline with marking paint","Excavate to depth + 12 inches extra","Remove all soil from site","Form & compact the sub-base","Inspect excavation before proceeding"]},
  {phase:"Phase 3",title:"Steel & Plumbing",icon:"🔩",days:"3-5 days",steps:["Install rebar grid per engineering specs","Place return & suction plumbing lines","Install main drain with dual outlet VGB cover","Run conduit for lighting & automation","Inspect all rough plumbing & steel"]},
  {phase:"Phase 4",title:"Gunite / Shotcrete",icon:"🏗️",days:"1-2 days",steps:["Wet rebar & forms before shooting","Apply gunite in one continuous pass","Hand-pack trowel all tight areas","Allow 28-day cure minimum","Wet-cure gunite daily for first week"]},
  {phase:"Phase 5",title:"Tile & Coping",icon:"🟦",days:"3-5 days",steps:["Install waterline tile band","Set bond beam coping stones or pavers","Grout all tile and coping joints","Seal coping to deck joint with flexible sealant","Allow full cure before water fill"]},
  {phase:"Phase 6",title:"Decking",icon:"🪵",days:"3-7 days",steps:["Form and pour concrete deck or set pavers","Install expansion joints at pool-deck interface","Apply deck surface coating or sealer","Install any hardscape features","Clean all surfaces"]},
  {phase:"Phase 7",title:"Equipment Install",icon:"⚙️",days:"1-2 days",steps:["Mount pump, filter, heater on equipment pad","Connect all plumbing to equipment","Wire all electrical per local code","Install automation control system","Pressure-test all plumbing lines"]},
  {phase:"Phase 8",title:"Interior Finish & Fill",icon:"💧",days:"2-3 days",steps:["Apply interior plaster, pebble, or quartz","Begin filling immediately after plaster","Brush plaster continuously during first fill","Start-up chemical balance per plasterer specs","Run pump continuously for first 2 weeks"]},
];

const SHOP_CATEGORIES=[
  {id:"tile",label:"Pool Tile",icon:"🟦",products:[
    {name:"Blue Glass Mosaic Waterline Tile 4x4",retailer:"Home Depot",badge:"Best Seller",img:"🟦",link:hdLink("blue glass mosaic pool tile"),earn:"2-8%"},
    {name:"Iridescent Waterline Pool Tile",retailer:"Wayfair",badge:"Top Rated",img:"🔷",link:wayfairLink("iridescent pool tile"),earn:"3-7%"},
    {name:"White Porcelain Pool Tile 6x6",retailer:"Lowe's",badge:"Value",img:"⬜",link:lowesLink("white porcelain pool tile"),earn:"1-4%"},
    {name:"Pebble Tec Stone Pool Finish Kit",retailer:"Amazon",badge:"Premium",img:"🪨",link:amazonLink("B07PBTECEF"),earn:"3-8%"},
  ]},
  {id:"pavers",label:"Pavers",icon:"🧱",products:[
    {name:"Travertine Pool Coping 12x24",retailer:"Home Depot",badge:"Top Pick",img:"🟫",link:hdLink("travertine pool coping"),earn:"2-8%"},
    {name:"Charcoal Concrete Paver 16x16",retailer:"Lowe's",badge:"Budget",img:"⬛",link:lowesLink("concrete paver 16x16"),earn:"1-4%"},
    {name:"Tumbled Travertine Deck Tile",retailer:"Amazon",badge:"Popular",img:"🟤",link:amazonLink("B089TRVTNE"),earn:"3-8%"},
    {name:"Bluestone Pool Deck Slabs",retailer:"Wayfair",badge:"Luxury",img:"🔵",link:wayfairLink("bluestone pool deck slabs"),earn:"3-7%"},
  ]},
  {id:"lighting",label:"Lighting",icon:"💡",products:[
    {name:"Pentair IntelliBrite 5G Color LED",retailer:"Amazon",badge:"Best Seller",img:"🔵",link:amazonLink("B01HIOVHGI"),earn:"3-8%"},
    {name:"Kichler 12V Landscape Path Lights 6-pack",retailer:"Home Depot",badge:"Top Rated",img:"🔆",link:hdLink("kichler landscape path lights"),earn:"2-8%"},
    {name:"Solar Deck Post Cap Lights",retailer:"Amazon",badge:"Easy Install",img:"☀️",link:amazonLink("B08SOLRDC1"),earn:"3-8%"},
    {name:"48ft Patio String Lights LED",retailer:"Wayfair",badge:"Ambiance",img:"✨",link:wayfairLink("patio string lights 48ft"),earn:"3-7%"},
  ]},
  {id:"furniture",label:"Furniture",icon:"🪑",products:[
    {name:"Teak Reclining Sun Lounger Set of 2",retailer:"Wayfair",badge:"Luxury",img:"🪑",link:wayfairLink("teak pool sun lounger set"),earn:"3-7%"},
    {name:"Aluminum Chaise Lounge Stackable",retailer:"Home Depot",badge:"Durable",img:"🛋️",link:hdLink("aluminum chaise lounge pool"),earn:"2-8%"},
    {name:"5-Piece Outdoor Dining Wicker Set",retailer:"Wayfair",badge:"Best Seller",img:"🍽️",link:wayfairLink("5 piece outdoor dining wicker"),earn:"3-7%"},
    {name:"Floating Pool Lounge Chair",retailer:"Amazon",badge:"Fun Pick",img:"🏊",link:amazonLink("B09FLOATCHR"),earn:"3-8%"},
  ]},
  {id:"umbrellas",label:"Shade",icon:"⛱️",products:[
    {name:"9ft Cantilever Offset Umbrella",retailer:"Wayfair",badge:"Top Rated",img:"☂️",link:wayfairLink("9ft cantilever offset patio umbrella"),earn:"3-7%"},
    {name:"Coolaroo Shade Sail 16ft Triangle",retailer:"Home Depot",badge:"Popular",img:"🔺",link:hdLink("coolaroo shade sail 16ft"),earn:"2-8%"},
    {name:"10ft Market Umbrella Solar LED",retailer:"Amazon",badge:"Smart",img:"⛱️",link:amazonLink("B09MKTUMBL"),earn:"3-8%"},
  ]},
  {id:"fire",label:"Fire Features",icon:"🔥",products:[
    {name:"Propane Fire Bowl 30in Concrete",retailer:"Amazon",badge:"Best Seller",img:"🔥",link:amazonLink("B08FIREBWL"),earn:"3-8%"},
    {name:"Natural Gas Fire Pit Table 48in",retailer:"Home Depot",badge:"Premium",img:"🏮",link:hdLink("natural gas fire pit table 48"),earn:"2-8%"},
    {name:"Fire & Water Bowl Combo",retailer:"Wayfair",badge:"Showpiece",img:"🌋",link:wayfairLink("fire water bowl pool"),earn:"3-7%"},
  ]},
  {id:"water_features",label:"Water Features",icon:"💧",products:[
    {name:"Pentair Deck Jet 2-pack",retailer:"Amazon",badge:"Pro Pick",img:"⛲",link:amazonLink("B00DECKJET"),earn:"3-8%"},
    {name:"Sheer Descent Water Curtain 24in",retailer:"Home Depot",badge:"Luxury",img:"💦",link:hdLink("sheer descent water curtain 24"),earn:"2-8%"},
    {name:"Stacked Stone Waterfall Kit",retailer:"Lowe's",badge:"Natural",img:"🪨",link:lowesLink("stacked stone waterfall kit pool"),earn:"1-4%"},
  ]},
  {id:"plants",label:"Landscaping",icon:"🌿",products:[
    {name:"Privacy Arborvitae 4ft Live Tree",retailer:"Home Depot",badge:"Best Seller",img:"🌲",link:hdLink("arborvitae privacy tree 4ft"),earn:"2-8%"},
    {name:"Bird of Paradise Plant Large",retailer:"Amazon",badge:"Tropical",img:"🌺",link:amazonLink("B07BIRDPRD"),earn:"3-8%"},
    {name:"Boxwood Hedge Live Plant 3-pack",retailer:"Amazon",badge:"Classic",img:"🟩",link:amazonLink("B09BOXWOOD3"),earn:"3-8%"},
  ]},
  {id:"safety",label:"Safety",icon:"🚧",products:[
    {name:"Pool Safety Fence 4ft x 12ft Panel",retailer:"Amazon",badge:"Best Seller",img:"🚧",link:amazonLink("B07SAFEFNC"),earn:"3-8%"},
    {name:"Pool Alarm In-Water Wave Sensor",retailer:"Amazon",badge:"Safety Tech",img:"🔔",link:amazonLink("B08POOLALM"),earn:"3-8%"},
    {name:"Pool Handrail Stainless 60in",retailer:"Lowe's",badge:"Code Required",img:"🔩",link:lowesLink("pool handrail stainless 60"),earn:"1-4%"},
  ]},
];

const RETAILER_COLORS = {
  "Home Depot":{bg:"rgba(255,102,0,0.15)",border:"rgba(255,102,0,0.35)",text:"#ff6600"},
  "Lowe's":{bg:"rgba(0,82,165,0.15)",border:"rgba(0,82,165,0.35)",text:"#4d9fff"},
  "Wayfair":{bg:"rgba(122,52,163,0.15)",border:"rgba(122,52,163,0.35)",text:"#c084fc"},
  "Amazon":{bg:"rgba(255,153,0,0.15)",border:"rgba(255,153,0,0.35)",text:"#ff9900"},
};

const NAV_TABS=[
  {id:0,label:"Design",icon:"🏊"},
  {id:1,label:"Entry & Features",icon:"🏖️"},
  {id:2,label:"Hardscapes",icon:"🧱"},
  {id:3,label:"Yard Planner",icon:"🗺️"},
  {id:4,label:"Materials",icon:"📊"},
  {id:5,label:"Cost Est.",icon:"💰"},
  {id:6,label:"Equipment",icon:"⚙️"},
  {id:7,label:"Build Guide",icon:"📋"},
  {id:8,label:"Shop",icon:"🛍️"},
  {id:9,label:"⚡ Quick Render",icon:""},
  {id:10,label:"Build Tracker",icon:"🏗️"},
  {id:11,label:"Settings",icon:"🔧"},
];


// ─── CLOUD STORAGE (Supabase) — optional, falls back to localStorage ─────────
// To activate: create a free project at supabase.com, then paste your
// Project URL and anon public key into the Cloud Sync panel on the Design tab.
// Until configured, everything works exactly as before using localStorage.
let supabaseClient = null;
let supabaseLoadPromise = null;

function getSupabaseConfig() {
  // Use environment variables first (production), fall back to localStorage (dev)
  if (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL) {
    return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
  }
  try {
    return {
      url: localStorage.getItem("pc_supabase_url") || "",
      key: localStorage.getItem("pc_supabase_key") || "",
    };
  } catch { return { url:"", key:"" }; }
}

async function loadSupabase() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  if (supabaseClient) return supabaseClient;
  if (!supabaseLoadPromise) {
    supabaseLoadPromise = (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        supabaseClient = createClient(url, key);
        return supabaseClient;
      } catch (e) {
        console.error("Supabase load failed", e);
        return null;
      }
    })();
  }
  return supabaseLoadPromise;
}

const SUPABASE_SETUP_SQL = `create table if not exists pool_projects (
  id text primary key,
  name text,
  data jsonb,
  saved_at bigint
);
alter table pool_projects enable row level security;
create policy "public access" on pool_projects for all using (true) with check (true);`;

// Unified project store: tries Supabase first (if configured), else localStorage.
async function listProjects() {
  const sb = await loadSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from("pool_projects").select("*").order("saved_at",{ascending:false}).limit(50);
      if (error) throw error;
      return (data||[]).map(r => ({ ...r.data, id:r.id, name:r.name, savedAt:r.saved_at }));
    } catch (e) { console.error("Supabase list failed, falling back", e); }
  }
  try { return JSON.parse(localStorage.getItem("pc_projects")||"[]"); } catch { return []; }
}

async function saveProjectRecord(project) {
  const sb = await loadSupabase();
  if (sb) {
    try {
      const { error } = await sb.from("pool_projects").upsert({
        id:String(project.id), name:project.name, data:project, saved_at:project.savedAt,
      });
      if (error) throw error;
      return true;
    } catch (e) { console.error("Supabase save failed, falling back to local", e); }
  }
  try {
    const existing = JSON.parse(localStorage.getItem("pc_projects")||"[]");
    const updated = [project, ...existing.filter(p=>p.id!==project.id)].slice(0,20);
    localStorage.setItem("pc_projects", JSON.stringify(updated));
  } catch {}
  return false;
}

async function deleteProjectRecord(id) {
  const sb = await loadSupabase();
  if (sb) {
    try {
      const { error } = await sb.from("pool_projects").delete().eq("id", String(id));
      if (error) throw error;
      return true;
    } catch (e) { console.error("Supabase delete failed, falling back", e); }
  }
  try {
    const existing = JSON.parse(localStorage.getItem("pc_projects")||"[]");
    localStorage.setItem("pc_projects", JSON.stringify(existing.filter(p=>p.id!==id)));
  } catch {}
  return false;
}

function CloudSyncPanel() {
  const [cfg, setCfg] = useState(getSupabaseConfig());
  const [urlInput, setUrlInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSql, setShowSql] = useState(false);
  const connected = !!(cfg.url && cfg.key);

  const save = async () => {
    const url = urlInput.trim(), key = keyInput.trim();
    if (!url || !key) return;
    try { localStorage.setItem("pc_supabase_url", url); localStorage.setItem("pc_supabase_key", key); } catch {}
    supabaseClient = null; supabaseLoadPromise = null;
    setCfg({ url, key }); setUrlInput(""); setKeyInput(""); setTestResult(null);
  };
  const disconnect = () => {
    try { localStorage.removeItem("pc_supabase_url"); localStorage.removeItem("pc_supabase_key"); } catch {}
    supabaseClient = null; supabaseLoadPromise = null;
    setCfg({ url:"", key:"" });
  };
  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const sb = await loadSupabase();
      if (!sb) throw new Error("Could not initialize client");
      const { error } = await sb.from("pool_projects").select("id").limit(1);
      if (error) throw error;
      setTestResult({ ok:true, msg:"Connected — cloud sync is active." });
    } catch (e) {
      setTestResult({ ok:false, msg:`${e.message || "Connection failed"}. Make sure you ran the setup SQL below.` });
    } finally { setTesting(false); }
  };

  const copySql = () => {
    try { navigator.clipboard.writeText(SUPABASE_SETUP_SQL); } catch {}
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {!connected ? (
        <div style={{background:"linear-gradient(135deg,rgba(34,197,94,0.1),rgba(22,163,74,0.05))",border:"1px solid rgba(34,197,94,0.25)",borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:800,color:"#22c55e",marginBottom:6}}>☁️ Activate Cloud Sync</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6,marginBottom:10}}>
            Right now your projects only live on this device. Add a free Supabase project to sync across phone, tablet, and desktop — and never lose work when you start a new chat or switch devices.
          </div>
          <div style={{background:"#0f172a",borderRadius:10,padding:12,marginBottom:10}}>
            {["Go to supabase.com and create a free account + new project","In your project: SQL Editor → paste the setup code below → Run","Project Settings → API → copy the Project URL and anon public key","Paste both below"].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                <span style={{minWidth:18,height:18,borderRadius:"50%",background:"rgba(34,197,94,0.2)",color:"#22c55e",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:12,color:"#64748b"}}>{s}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowSql(p=>!p)} style={{fontSize:11,color:"#22c55e",background:"none",border:"none",cursor:"pointer",padding:0,marginBottom:showSql?8:0}}>
            {showSql?"▲ Hide setup code":"▼ Show setup SQL code"}
          </button>
          {showSql&&(
            <div style={{marginBottom:10}}>
              <pre style={{background:"#0a0e1a",border:"1px solid #1e293b",borderRadius:8,padding:10,fontSize:10,color:"#86efac",overflowX:"auto",whiteSpace:"pre-wrap",margin:0}}>{SUPABASE_SETUP_SQL}</pre>
              <button onClick={copySql} style={{marginTop:6,padding:"5px 10px",borderRadius:6,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",color:"#22c55e",fontSize:11,fontWeight:700,cursor:"pointer"}}>📋 Copy SQL</button>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <input type="text" value={urlInput} onChange={e=>setUrlInput(e.target.value)} placeholder="Project URL (https://xxxx.supabase.co)" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
            <input type="password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="anon public key" style={{background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
            <button onClick={save} disabled={!urlInput.trim()||!keyInput.trim()} style={{padding:"10px 18px",borderRadius:10,background:urlInput.trim()&&keyInput.trim()?"linear-gradient(135deg,#22c55e,#16a34a)":"#1e293b",border:"none",color:"white",fontWeight:700,fontSize:13,cursor:urlInput.trim()&&keyInput.trim()?"pointer":"not-allowed"}}>Connect</button>
          </div>
          <div style={{marginTop:8,fontSize:11,color:"#64748b"}}>Until connected, projects save to this device only — everything still works, it just won't follow you to other devices.</div>
        </div>
      ) : (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>✅ Cloud Sync Connected</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{cfg.url}</div>
            </div>
            <button onClick={disconnect} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Disconnect</button>
          </div>
          <button onClick={testConnection} disabled={testing} style={{padding:"8px 14px",borderRadius:8,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.25)",color:"#06b6d4",fontSize:12,fontWeight:700,cursor:testing?"not-allowed":"pointer"}}>
            {testing?"Testing...":"🔄 Test Connection"}
          </button>
          {testResult&&(
            <div style={{marginTop:8,fontSize:12,color:testResult.ok?"#22c55e":"#ef4444",lineHeight:1.5}}>{testResult.ok?"✅":"⚠️"} {testResult.msg}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── REGRID PARCEL LOOKUP — drop in a real key when ready ─────────────────────
// Sign up at regrid.com to get real parcel data (lot size, zoning, setbacks).
// Until a key is added below, the app uses realistic estimated data so the
// rest of the planning flow works end-to-end.
function getRegridKey() {
  try { return localStorage.getItem("pc_regrid_key") || ""; } catch { return ""; }
}

async function lookupParcel(addr) {
  const REGRID_KEY = getRegridKey();
  if (!REGRID_KEY) {
    return {
      address: addr,
      parcel: `APN-${Math.floor(Math.random()*900000+100000)}`,
      lot_size: `${(Math.random()*0.4+0.15).toFixed(2)} acres`,
      lot_sqft: `${Math.floor(Math.random()*8000+5000).toLocaleString()} sq ft`,
      zoning: "R-1 Single Family Residential",
      setback_front: "20 ft", setback_rear: "10 ft", setback_side: "5 ft",
      pool_setback: "5 ft from property line",
      source: "estimated",
    };
  }
  const encoded = encodeURIComponent(addr);
  const resp = await fetch(`https://app.regrid.com/api/v1/search.json?query=${encoded}&token=${REGRID_KEY}&limit=1`);
  if (!resp.ok) throw new Error("Regrid API error");
  const data = await resp.json();
  const p = data?.results?.[0];
  if (!p) throw new Error("Address not found");
  return {
    address: p.fields?.address || addr,
    parcel:  p.fields?.parcelnumb || "—",
    lot_size: p.fields?.ll_gisacre ? `${Number(p.fields.ll_gisacre).toFixed(2)} acres` : "—",
    lot_sqft: p.fields?.ll_gissqft ? `${Math.round(p.fields.ll_gissqft).toLocaleString()} sq ft` : "—",
    zoning:   p.fields?.zoning_description || p.fields?.zoning || "Residential",
    setback_front: "Verify with county", setback_rear: "Verify with county",
    setback_side: "Verify with county", pool_setback: "Verify with county",
    source: "regrid",
  };
}

function RegridKeyPanel() {
  const [key, setKey] = useState(getRegridKey());
  const [input, setInput] = useState("");
  const save = () => {
    const k = input.trim(); if (!k) return;
    try { localStorage.setItem("pc_regrid_key", k); } catch {}
    setKey(k); setInput("");
  };
  const remove = () => {
    try { localStorage.removeItem("pc_regrid_key"); } catch {}
    setKey("");
  };
  if (key) {
    return (
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:8,marginTop:8}}>
        <div style={{fontSize:11,fontWeight:700,color:"#22c55e"}}>✅ Regrid live parcel data — active</div>
        <button onClick={remove} style={{fontSize:11,color:"#64748b",background:"none",border:"none",cursor:"pointer",padding:"8px 4px",minHeight:36}}>Remove</button>
      </div>
    );
  }
  return (
    <div style={{marginTop:8,padding:"10px 12px",background:"rgba(100,116,139,0.08)",border:"1px dashed #334155",borderRadius:8}}>
      <div style={{fontSize:11,color:"#94a3b8",marginBottom:6}}>Currently using estimated parcel data. Add a Regrid API key (regrid.com) before launch for real lot size, zoning & setbacks.</div>
      <div style={{display:"flex",gap:6}}>
        <input type="password" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="Paste Regrid API key..." style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:6,padding:"6px 10px",color:"#e2e8f0",fontSize:11,outline:"none"}}/>
        <button onClick={save} disabled={!input.trim()} style={{padding:"6px 12px",borderRadius:6,background:input.trim()?"rgba(34,197,94,0.15)":"#1e293b",border:"1px solid rgba(34,197,94,0.3)",color:input.trim()?"#22c55e":"#64748b",fontSize:11,fontWeight:700,cursor:input.trim()?"pointer":"not-allowed"}}>Save</button>
      </div>
    </div>
  );
}

// ─── 3D POOL PREVIEW ───────────────────────────────────────────────────────────
// Lightweight hand-rolled 3D renderer (no external libraries) so this works
// reliably anywhere the app is deployed. Orbit with drag, pinch/scroll to zoom.
// Performance: uses requestAnimationFrame + refs for hot state so auto-spin
// and drag never trigger React re-renders — canvas-only updates at display rate.
function Pool3D({ poolLen, poolWid, poolShape, poolColor, depthId, entries, finishId }) {
  const canvasRef = useRef(null);
  // Ref-based hot state: changes here redraw canvas without touching React
  const stateRef = useRef({ rotY:0.6, rotX:0.45, zoom:1, dragging:false });
  const lastPos = useRef({x:0,y:0});
  const rafRef = useRef(null);
  // React state only for control UI (buttons that need to render)
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewMode, setViewMode] = useState("orbit");
  const autoRotateRef = useRef(true);
  const viewModeRef = useRef("orbit");

  const avgDepth = {shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25;
  const shallowD = {shallow:3,standard:3.5,deep:3.5,diving:4}[depthId]||3.5;
  const deepD = {shallow:4,standard:5,deep:6,diving:8}[depthId]||5;
  const hasSpa = !!entries?.spa_attached;

  // Keep refs in sync with UI state changes
  useEffect(()=>{ autoRotateRef.current = autoRotate; },[autoRotate]);
  useEffect(()=>{ viewModeRef.current = viewMode; },[viewMode]);

  const project = useCallback((pt, W, H, ry, rx, z) => {
    let { x, y, z: pz } = pt;
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const x1 = x * cosY - pz * sinY;
    const z1 = x * sinY + pz * cosY;
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const camDist = 60 / z;
    const scale = camDist / (camDist + z2 + 30);
    return { sx: W/2 + x1 * scale * z, sy: H/2 + y1 * scale * z, depth: z2 };
  }, []);

  // Core draw — reads from refs, never triggers React
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const { rotY, rotX, zoom } = stateRef.current;
    const vm = viewModeRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    const sky = ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,"#1a2c42"); sky.addColorStop(1,"#0b1120");
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H);

    const ry = vm==="top" ? 0 : vm==="side" ? 1.57 : rotY;
    const rx = vm==="top" ? 1.5 : vm==="side" ? 0.15 : rotX;
    const z = 14 * zoom;

    const safeLen = Number.isFinite(poolLen) && poolLen > 0 ? poolLen : 1;
    const safeWid = Number.isFinite(poolWid) && poolWid > 0 ? poolWid : 1;
    const maxDim = Math.max(safeLen, safeWid, 1);
    const Lh = (safeLen/maxDim) * 9;
    const Wh = (safeWid/maxDim) * 9;
    const deckPad = 4;
    const D = -avgDepth * 0.9;

    const deckCorners = [
      {x:-Lh-deckPad, y:0, z:-Wh-deckPad}, {x:Lh+deckPad, y:0, z:-Wh-deckPad},
      {x:Lh+deckPad, y:0, z:Wh+deckPad}, {x:-Lh-deckPad, y:0, z:Wh+deckPad},
    ];
    const deckProj = deckCorners.map(p=>project(p,W,H,ry,rx,z));
    ctx.fillStyle = "#3a3226";
    ctx.beginPath(); ctx.moveTo(deckProj[0].sx,deckProj[0].sy);
    deckProj.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
    for(let i=-2;i<=2;i++){
      const a = project({x:i*(Lh+deckPad)/2, y:0, z:-Wh-deckPad}, W,H,ry,rx,z);
      const b = project({x:i*(Lh+deckPad)/2, y:0, z:Wh+deckPad}, W,H,ry,rx,z);
      ctx.beginPath(); ctx.moveTo(a.sx,a.sy); ctx.lineTo(b.sx,b.sy); ctx.stroke();
    }

    const rimTop = [{x:-Lh,y:0,z:-Wh}, {x:Lh,y:0,z:-Wh}, {x:Lh,y:0,z:Wh}, {x:-Lh,y:0,z:Wh}];
    const rimBottom = rimTop.map(p=>({...p,y:D}));
    const rimTopProj = rimTop.map(p=>project(p,W,H,ry,rx,z));
    const rimBotProj = rimBottom.map(p=>project(p,W,H,ry,rx,z));

    const faces = [];
    for(let i=0;i<4;i++){
      const j=(i+1)%4;
      const avgZ = (rimTopProj[i].depth+rimTopProj[j].depth+rimBotProj[i].depth+rimBotProj[j].depth)/4;
      faces.push({ type:"wall", avgZ, pts:[rimTopProj[i],rimTopProj[j],rimBotProj[j],rimBotProj[i]], shade: 0.55 + (i%2)*0.1 });
    }
    const floorPts = rimBottom.map(p=>project(p,W,H,ry,rx,z));
    const floorAvgZ = floorPts.reduce((s,p)=>s+p.depth,0)/4;
    faces.push({ type:"floor", avgZ:floorAvgZ, pts:floorPts });
    const waterPts = rimTop.map(p=>({...p,y:D*0.06}));
    const waterProj = waterPts.map(p=>project(p,W,H,ry,rx,z));
    const waterAvgZ = waterProj.reduce((s,p)=>s+p.depth,0)/4;
    faces.push({ type:"water", avgZ:waterAvgZ-0.01, pts:waterProj });
    const copingAvgZ = rimTopProj.reduce((s,p)=>s+p.depth,0)/4;
    faces.push({ type:"coping", avgZ:copingAvgZ+0.02, pts:rimTopProj });
    faces.sort((a,b)=>b.avgZ-a.avgZ);

    faces.forEach(f=>{
      ctx.beginPath(); ctx.moveTo(f.pts[0].sx,f.pts[0].sy);
      f.pts.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy)); ctx.closePath();
      if(f.type==="water"){
        const grad = ctx.createLinearGradient(f.pts[0].sx,f.pts[0].sy,f.pts[2].sx,f.pts[2].sy);
        grad.addColorStop(0, poolColor); grad.addColorStop(1, poolColor+"cc");
        ctx.fillStyle = grad; ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
        for(let i=1;i<4;i++){
          const t = i/4;
          const p1={sx:f.pts[0].sx+(f.pts[1].sx-f.pts[0].sx)*t, sy:f.pts[0].sy+(f.pts[1].sy-f.pts[0].sy)*t};
          const p2={sx:f.pts[3].sx+(f.pts[2].sx-f.pts[3].sx)*t, sy:f.pts[3].sy+(f.pts[2].sy-f.pts[3].sy)*t};
          ctx.beginPath(); ctx.moveTo(p1.sx,p1.sy); ctx.lineTo(p2.sx,p2.sy); ctx.stroke();
        }
      } else if(f.type==="coping"){
        ctx.fillStyle="rgba(210,190,160,0.95)"; ctx.fill();
        ctx.strokeStyle="rgba(150,130,100,0.6)"; ctx.lineWidth=1; ctx.stroke();
      } else if(f.type==="floor"){
        const finColors={plaster:"#e8e4dc",pebble:"#9a8b76",quartz:"#c9bfae",tile:"#3b82f6",fiberglass:"#dbeafe",glass_bead:"#a5d8e8"};
        ctx.fillStyle=(finColors[finishId]||"#9a8b76")+"dd"; ctx.fill();
      } else {
        ctx.fillStyle=`rgba(180,200,210,${f.shade})`; ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,0.2)"; ctx.lineWidth=0.5; ctx.stroke();
      }
    });

    if(hasSpa){
      const sx0=Lh*0.55, sz0=-Wh-deckPad*0.4, sw=Lh*0.4, sd=Wh*0.45;
      const spaTop=[{x:sx0,y:0,z:sz0},{x:sx0+sw,y:0,z:sz0},{x:sx0+sw,y:0,z:sz0+sd},{x:sx0,y:0,z:sz0+sd}].map(p=>project(p,W,H,ry,rx,z));
      ctx.beginPath(); ctx.moveTo(spaTop[0].sx,spaTop[0].sy); spaTop.slice(1).forEach(p=>ctx.lineTo(p.sx,p.sy)); ctx.closePath();
      ctx.fillStyle="rgba(124,58,237,0.55)"; ctx.fill(); ctx.strokeStyle="rgba(124,58,237,0.8)"; ctx.stroke();
    }

    ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font="11px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`${poolLen}' x ${poolWid}' - ${shallowD}'-${deepD}' deep`, W/2, H-12);
  }, [poolLen, poolWid, poolShape, poolColor, avgDepth, hasSpa, finishId, project]);

  // rAF loop: auto-spin mutates ref directly, draws every frame; pauses when not needed
  useEffect(()=>{
    let active = true;
    const loop = () => {
      if (!active) return;
      if (autoRotateRef.current && !stateRef.current.dragging && viewModeRef.current==="orbit") {
        stateRef.current.rotY += 0.006;
      }
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [drawFrame]);

  // Redraw on prop changes (shape/color/finish etc.) — draw is already called by rAF loop so this is a no-op most of the time
  useEffect(()=>{ drawFrame(); },[drawFrame]);

  const getPos = (e) => {
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;
    return {x:cx,y:cy};
  };
  const onDown = (e) => {
    stateRef.current.dragging = true;
    setAutoRotate(false); autoRotateRef.current = false;
    lastPos.current = getPos(e); e.preventDefault();
  };
  const onMove = (e) => {
    if(!stateRef.current.dragging || viewModeRef.current!=="orbit") return;
    const pos = getPos(e);
    const dx = pos.x - lastPos.current.x, dy = pos.y - lastPos.current.y;
    stateRef.current.rotY += dx * 0.01;
    stateRef.current.rotX = Math.max(0.1, Math.min(1.5, stateRef.current.rotX + dy * 0.01));
    lastPos.current = pos;
    e.preventDefault();
  };
  const onUp = () => { stateRef.current.dragging = false; };
  const onWheel = (e) => {
    stateRef.current.zoom = Math.max(0.5, Math.min(2.2, stateRef.current.zoom - e.deltaY * 0.001));
    e.preventDefault();
  };
  const handleZoomBtn = (delta) => { stateRef.current.zoom = Math.max(0.5, Math.min(2.2, stateRef.current.zoom + delta)); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[{id:"orbit",label:"🔄 Orbit"},{id:"top",label:"⬇️ Top-Down"},{id:"side",label:"➡️ Side"}].map(v=>(
          <button key={v.id} onClick={()=>{setViewMode(v.id); viewModeRef.current=v.id; if(v.id==="orbit"){ setAutoRotate(true); autoRotateRef.current=true; }}} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:`2px solid ${viewMode===v.id?"#06b6d4":"#334155"}`,background:viewMode===v.id?"rgba(6,182,212,0.1)":"#111827",color:viewMode===v.id?"#06b6d4":"#94a3b8",fontSize:12,fontWeight:700,cursor:"pointer"}}>{v.label}</button>
        ))}
        <button onClick={()=>{ const next=!autoRotate; setAutoRotate(next); autoRotateRef.current=next; }} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:`2px solid ${autoRotate?"#22c55e88":"#334155"}`,background:autoRotate?"rgba(34,197,94,0.1)":"#111827",color:autoRotate?"#22c55e":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>{autoRotate?"⏸ Pause Spin":"▶️ Auto-Spin"}</button>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={()=>handleZoomBtn(0.15)} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          <button onClick={()=>handleZoomBtn(-0.15)} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
        </div>
      </div>
      <div style={{borderRadius:14,overflow:"hidden",border:"2px solid #334155",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
        <canvas ref={canvasRef} width={560} height={380}
          style={{display:"block",width:"100%",cursor:stateRef.current.dragging?"grabbing":viewMode==="orbit"?"grab":"default",touchAction:"none",background:"#0b1120",willChange:"transform"}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onWheel={onWheel} />
      </div>
      <div style={{fontSize:11,color:"#64748b",textAlign:"center"}}>🖱️ Drag to rotate - Scroll or +/− to zoom - This is a proportional preview, not a construction-grade model</div>
    </div>
  );
}

// ─── INTERACTIVE PROPERTY MAP ─────────────────────────────────────────────────
function PropertyMap({ poolLen, poolWid, poolShape, poolColor, parcelData }) {
  const canvasRef = useRef(null);
  const [poolPos, setPoolPos] = useState({ x:0.5, y:0.65 });
  const [dragging, setDragging] = useState(false);
  const [dragOff, setDragOff] = useState({ x:0, y:0 });
  const [showSetbacks, setShowSetbacks] = useState(true);
  const [showMeasure, setShowMeasure] = useState(true);
  const [mapImgUrl, setMapImgUrl] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [coords, setCoords] = useState(null);
  const [zoom, setZoom] = useState(20);
  const mapImgRef = useRef(null);

  const CW = 560, CH = 440;
  const POOL_W = Math.min(Math.max(poolLen*5.2,55),CW*0.5);
  const POOL_H = Math.min(Math.max(poolWid*5.2,34),CH*0.34);
  const SB_SIDE=26, SB_REAR=50, SB_FRONT=100;

  const geocode = async (address) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,{headers:{"Accept-Language":"en","User-Agent":"PoolCraftPro/1.0"}});
      const d = await r.json();
      if(d&&d[0]) return {lat:parseFloat(d[0].lat), lng:parseFloat(d[0].lon)};
    } catch{}
    return null;
  };

  // Routes through the /api/maps serverless proxy (server-side GOOGLE_MAPS_KEY) instead
  // of calling Google directly with a client-exposed key.
  const buildMapUrl = (lat, lng, z) => `/api/maps?lat=${lat}&lng=${lng}&zoom=${z}&width=${CW}&height=${CH}`;

  useEffect(()=>{
    if(!parcelData?.address) return;
    (async()=>{
      const c = await geocode(parcelData.address);
      if(c){ setCoords(c); setMapLoaded(false); setMapError(false); setPoolPos({x:0.5,y:0.65}); setMapImgUrl(buildMapUrl(c.lat,c.lng,zoom)); }
    })();
  },[parcelData?.address]);

  useEffect(()=>{
    if(coords){ setMapImgUrl(buildMapUrl(coords.lat,coords.lng,zoom)); setMapLoaded(false); setMapError(false); }
  },[zoom, coords]);

  const drawOverlay = useCallback(()=>{
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    ctx.clearRect(0,0,CW,CH);

    if(mapImgRef.current && mapLoaded){
      ctx.drawImage(mapImgRef.current,0,0,CW,CH);
    } else {
      const skyGrad=ctx.createLinearGradient(0,0,0,CH*0.45);
      skyGrad.addColorStop(0,"#87ceeb"); skyGrad.addColorStop(1,"#b8e4f7");
      ctx.fillStyle=skyGrad; ctx.fillRect(0,0,CW,CH*0.45);
      const gndGrad=ctx.createLinearGradient(0,CH*0.45,0,CH);
      gndGrad.addColorStop(0,"#4a8c35"); gndGrad.addColorStop(1,"#2d5a1b");
      ctx.fillStyle=gndGrad; ctx.fillRect(0,CH*0.45,CW,CH*0.55);
      ctx.fillStyle="#c9aa87";
      ctx.beginPath(); ctx.roundRect(CW*0.12,CH*0.1,CW*0.76,CH*0.22,4); ctx.fill();
      ctx.strokeStyle="#9a7a5a"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(CW*0.12,CH*0.21); ctx.lineTo(CW*0.88,CH*0.21); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CW*0.38,CH*0.1); ctx.lineTo(CW*0.38,CH*0.21); ctx.stroke();
      ctx.strokeStyle="#7a5a3a"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(CW*0.12,CH*0.1,CW*0.76,CH*0.22,4); ctx.stroke();
      ctx.font="bold 10px Inter,sans-serif"; ctx.fillStyle="rgba(0,0,0,0.45)";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("HOUSE",CW*0.5,CH*0.21);
      ctx.fillStyle="#9ca3af";
      ctx.fillRect(CW*0.16,0,CW*0.2,CH*0.12);
      ctx.fillStyle="#d4c5a9";
      ctx.beginPath(); ctx.roundRect(CW*0.08,CH*0.38,CW*0.84,CH*0.52,10); ctx.fill();
      if(!parcelData){
        ctx.fillStyle="rgba(11,17,32,0.72)";
        ctx.beginPath(); ctx.roundRect(CW*0.15,CH*0.54,CW*0.7,40,10); ctx.fill();
        ctx.font="bold 12px Inter,sans-serif"; ctx.fillStyle="#94a3b8";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("Search an address above to load satellite view",CW/2,CH*0.585);
      } else if(mapError){
        ctx.fillStyle="rgba(11,17,32,0.72)";
        ctx.beginPath(); ctx.roundRect(CW*0.1,CH*0.54,CW*0.8,40,10); ctx.fill();
        ctx.font="bold 12px Inter,sans-serif"; ctx.fillStyle="#ef4444";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("Satellite imagery unavailable - check server Maps key",CW/2,CH*0.585);
      } else {
        ctx.fillStyle="rgba(11,17,32,0.72)";
        ctx.beginPath(); ctx.roundRect(CW*0.15,CH*0.54,CW*0.7,40,10); ctx.fill();
        ctx.font="bold 12px Inter,sans-serif"; ctx.fillStyle="#94a3b8";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("Loading satellite view...",CW/2,CH*0.585);
      }
    }

    const px=poolPos.x*CW, py=poolPos.y*CH;

    if(showSetbacks){
      ctx.save(); ctx.globalAlpha=0.15; ctx.fillStyle="#f59e0b";
      ctx.fillRect(0,0,CW,SB_FRONT); ctx.fillRect(0,CH-SB_REAR,CW,SB_REAR);
      ctx.fillRect(0,0,SB_SIDE,CH); ctx.fillRect(CW-SB_SIDE,0,SB_SIDE,CH);
      ctx.restore();
      ctx.save(); ctx.strokeStyle="#f59e0b"; ctx.lineWidth=1.5; ctx.setLineDash([5,4]); ctx.globalAlpha=0.9;
      ctx.beginPath(); ctx.moveTo(0,SB_FRONT); ctx.lineTo(CW,SB_FRONT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,CH-SB_REAR); ctx.lineTo(CW,CH-SB_REAR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(SB_SIDE,0); ctx.lineTo(SB_SIDE,CH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CW-SB_SIDE,0); ctx.lineTo(CW-SB_SIDE,CH); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      ctx.save(); ctx.font="bold 9px Inter,sans-serif"; ctx.fillStyle="#f59e0b";
      ctx.textAlign="center"; ctx.globalAlpha=0.95;
      ctx.fillText("20ft front setback",CW/2,SB_FRONT-4);
      ctx.fillText("10ft rear setback",CW/2,CH-SB_REAR+10); ctx.restore();
    }

    if(showSetbacks){
      ctx.save(); ctx.strokeStyle="#22c55e"; ctx.lineWidth=1.5; ctx.setLineDash([4,3]); ctx.globalAlpha=0.65;
      if(poolShape==="oval"||poolShape==="freeform"||poolShape==="figure8"){
        ctx.beginPath(); ctx.ellipse(px,py,POOL_W/2+18,POOL_H/2+18,0,0,Math.PI*2); ctx.stroke();
      } else { ctx.strokeRect(px-POOL_W/2-18,py-POOL_H/2-18,POOL_W+36,POOL_H+36); }
      ctx.setLineDash([]); ctx.restore();
    }

    const grad=ctx.createRadialGradient(px-POOL_W*0.15,py-POOL_H*0.15,4,px,py,Math.max(POOL_W,POOL_H)*0.7);
    grad.addColorStop(0,poolColor+"ff"); grad.addColorStop(0.6,poolColor+"cc"); grad.addColorStop(1,poolColor+"88");
    ctx.save(); ctx.shadowColor=poolColor+"99"; ctx.shadowBlur=18; ctx.shadowOffsetY=4;
    ctx.fillStyle=grad; ctx.beginPath();
    if(poolShape==="oval"||poolShape==="freeform"||poolShape==="figure8") ctx.ellipse(px,py,POOL_W/2,POOL_H/2,0,0,Math.PI*2);
    else ctx.roundRect(px-POOL_W/2,py-POOL_H/2,POOL_W,POOL_H,8);
    ctx.fill(); ctx.restore();

    ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle="#fff"; ctx.lineWidth=1.5;
    for(let i=0;i<5;i++){ const ly=py-POOL_H*0.3+i*(POOL_H*0.14); ctx.beginPath(); ctx.moveTo(px-POOL_W*0.35,ly); ctx.bezierCurveTo(px-POOL_W*0.1,ly-4,px+POOL_W*0.1,ly+4,px+POOL_W*0.35,ly); ctx.stroke(); }
    ctx.restore();

    ctx.save(); ctx.strokeStyle="rgba(210,190,160,0.82)"; ctx.lineWidth=6;
    ctx.beginPath();
    if(poolShape==="oval"||poolShape==="freeform") ctx.ellipse(px,py,POOL_W/2+4,POOL_H/2+4,0,0,Math.PI*2);
    else ctx.roundRect(px-POOL_W/2-4,py-POOL_H/2-4,POOL_W+8,POOL_H+8,10);
    ctx.stroke(); ctx.restore();

    ctx.save(); ctx.fillStyle="rgba(0,0,0,0.72)"; ctx.beginPath(); ctx.roundRect(px-50,py-12,100,24,8); ctx.fill();
    ctx.font="bold 11px Inter,sans-serif"; ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(`${poolLen}' x ${poolWid}'`,px,py); ctx.restore();

    if(showMeasure){
      const drawM=(x1,y1,x2,y2,label,color="#22c55e")=>{
        const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy); if(len<10) return;
        const nx=-dy/len,ny=dx/len;
        ctx.save(); ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=1.5; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
        [[x1,y1],[x2,y2]].forEach(([tx,ty])=>{ ctx.beginPath(); ctx.moveTo(tx+nx*5,ty+ny*5); ctx.lineTo(tx-nx*5,ty-ny*5); ctx.stroke(); });
        const mx=(x1+x2)/2,my=(y1+y2)/2; ctx.font="bold 9px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        const tw=ctx.measureText(label).width+6; ctx.fillStyle="rgba(0,0,0,0.72)"; ctx.beginPath(); ctx.roundRect(mx-tw/2,my-7,tw,14,4); ctx.fill();
        ctx.fillStyle=color; ctx.fillText(label,mx,my); ctx.restore();
      };
      const s=100/(CW-SB_SIDE*2);
      drawM(SB_SIDE,py,px-POOL_W/2,py,`${Math.round(Math.max(0,px-POOL_W/2-SB_SIDE)*s)}ft`,"#22c55e");
      drawM(px+POOL_W/2,py,CW-SB_SIDE,py,`${Math.round(Math.max(0,CW-SB_SIDE-px-POOL_W/2)*s)}ft`,"#22c55e");
      drawM(px,py+POOL_H/2,px,CH-SB_REAR,`${Math.round(Math.max(0,CH-SB_REAR-py-POOL_H/2)*s)}ft`,"#22c55e");
      if(py-POOL_H/2-SB_FRONT>10) drawM(px,SB_FRONT,px,py-POOL_H/2,`${Math.round((py-POOL_H/2-SB_FRONT)*s)}ft`,"#06b6d4");
    }

    const viol=[];
    if(px-POOL_W/2<SB_SIDE) viol.push("left"); if(px+POOL_W/2>CW-SB_SIDE) viol.push("right");
    if(py-POOL_H/2<SB_FRONT) viol.push("front"); if(py+POOL_H/2>CH-SB_REAR) viol.push("rear");
    ctx.save(); ctx.fillStyle=viol.length?"rgba(239,68,68,0.9)":"rgba(34,197,94,0.9)";
    ctx.beginPath(); ctx.roundRect(CW/2-130,CH-30,260,22,7); ctx.fill();
    ctx.font="bold 10px Inter,sans-serif"; ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(viol.length?`Setback: ${viol.join(", ")} - drag to fix`:"Within all setbacks",CW/2,CH-19);
    ctx.restore();

    ctx.save(); ctx.fillStyle="rgba(0,0,0,0.75)"; ctx.beginPath(); ctx.arc(CW-22,22,14,0,Math.PI*2); ctx.fill();
    ctx.font="bold 9px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="#ef4444"; ctx.fillText("N",CW-22,15);
    ctx.fillStyle="#fff"; ctx.fillText("S",CW-22,29); ctx.fillText("W",CW-30,22); ctx.fillText("E",CW-14,22);
    ctx.restore();
  },[poolPos,poolLen,poolWid,poolShape,poolColor,showSetbacks,showMeasure,mapLoaded,mapError,parcelData]);

  const rafPending = useRef(false);
  useEffect(()=>{
    if(rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(()=>{ rafPending.current = false; drawOverlay(); });
  },[drawOverlay]);

  useEffect(()=>{
    if(!mapImgUrl) return;
    const img = new Image();
    img.onload = ()=>{ mapImgRef.current=img; setMapLoaded(true); setMapError(false); };
    img.onerror = ()=>{ mapImgRef.current=null; setMapLoaded(false); setMapError(true); };
    img.src = mapImgUrl;
  },[mapImgUrl]);

  const getPos=(e)=>{
    const rect=canvasRef.current.getBoundingClientRect();
    const sx=CW/rect.width,sy=CH/rect.height;
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return{x:(cx-rect.left)*sx,y:(cy-rect.top)*sy};
  };
  const onDown=(e)=>{
    const pos=getPos(e),px=poolPos.x*CW,py=poolPos.y*CH;
    if(Math.abs(pos.x-px)<POOL_W/2+16&&Math.abs(pos.y-py)<POOL_H/2+16){ setDragging(true); setDragOff({x:pos.x-px,y:pos.y-py}); }
    e.preventDefault();
  };
  const onMove=(e)=>{
    if(!dragging) return;
    const pos=getPos(e);
    setPoolPos({
      x:Math.max((POOL_W/2+4)/CW,Math.min(1-(POOL_W/2+4)/CW,(pos.x-dragOff.x)/CW)),
      y:Math.max((POOL_H/2+4)/CH,Math.min(1-(POOL_H/2+4)/CH,(pos.y-dragOff.y)/CH)),
    });
    e.preventDefault();
  };
  const onUp=()=>setDragging(false);

  const printMap=()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const dataUrl=canvas.toDataURL("image/png");
    const win=window.open("","_blank"); if(!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Pool Craft Pro - Site Plan</title>
    <style>body{margin:0;padding:20px;font-family:Inter,sans-serif}h2{font-size:16px;margin:0 0 4px}
    p{color:#64748b;font-size:12px;margin:0 0 14px}img.map{max-width:100%;border:2px solid #e2e8f0;border-radius:8px}
    .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}
    .mb{border:1px solid #e2e8f0;border-radius:6px;padding:10px}.mb label{font-size:10px;color:#94a3b8;text-transform:uppercase;display:block}
    .mb span{font-size:14px;font-weight:700;color:#0f172a}
    .footer{margin-top:14px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}
    </style></head><body>
    <h2>Pool Craft Pro - Pool Placement Site Plan</h2>
    <p>${parcelData?.address||"Property Site Plan"} - ${new Date().toLocaleDateString()}</p>
    <img class="map" src="${dataUrl}"/>
    <div class="meta">
      <div class="mb"><label>Pool Size</label><span>${poolLen}' x ${poolWid}'</span></div>
      <div class="mb"><label>APN</label><span>${parcelData?.parcel||"-"}</span></div>
      <div class="mb"><label>Front Setback</label><span>${parcelData?.setback_front||"20 ft"}</span></div>
      <div class="mb"><label>Pool Setback</label><span>${parcelData?.pool_setback||"5 ft"}</span></div>
    </div>
    <div class="footer">For planning reference only. Verify setbacks with your local building department before permits. Generated by Pool Craft Pro · Design Pools. Craft Outdoor Living..</div>
    <script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  const printScaledSitePlan = () => {
    // Builds a dedicated, dimensioned, scaled drawing - separate canvas from
    // the interactive map so the output reads like an actual site plan rather
    // than a screenshot of the app UI.
    const PW = 1000, PH = 760;
    const drawCanvas = document.createElement("canvas");
    drawCanvas.width = PW; drawCanvas.height = PH;
    const ctx = drawCanvas.getContext("2d", { willReadFrequently: false });
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,PW,PH);

    // Determine a feet-per-pixel scale: fit pool + 30ft margin into drawing area
    const marginFt = 25;
    const drawAreaW = PW - 160, drawAreaH = PH - 220;
    const spanFt = Math.max(poolLen, poolWid) + marginFt*2;
    const scale = Math.min(drawAreaW/spanFt, drawAreaH/spanFt); // px per ft
    const originX = PW/2, originY = 130 + drawAreaH/2;

    const ftToPx = (ftX, ftY) => ({ x: originX + ftX*scale, y: originY + ftY*scale });

    // Property line (dashed)
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.5; ctx.setLineDash([6,4]);
    const propPad = marginFt*0.85;
    const pTL = ftToPx(-poolLen/2-propPad, -poolWid/2-propPad);
    const pBR = ftToPx(poolLen/2+propPad, poolWid/2+propPad);
    ctx.strokeRect(pTL.x, pTL.y, pBR.x-pTL.x, pBR.y-pTL.y);
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText("Approximate property boundary (verify with survey)", pTL.x, pTL.y - 8);

    // Setback zone (front)
    const setbackFt = 20;
    ctx.fillStyle = "rgba(245,158,11,0.08)";
    const sbTop = ftToPx(-poolLen/2-propPad, -poolWid/2-propPad);
    const sbBot = ftToPx(poolLen/2+propPad, -poolWid/2-propPad+setbackFt);
    ctx.fillRect(sbTop.x, sbTop.y, sbBot.x-sbTop.x, sbBot.y-sbTop.y);
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth=1; ctx.setLineDash([4,3]);
    ctx.strokeRect(sbTop.x, sbTop.y, sbBot.x-sbTop.x, sbBot.y-sbTop.y);
    ctx.setLineDash([]);
    ctx.fillStyle = "#b45309"; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center";
    ctx.fillText(`${setbackFt}ft front setback`, (sbTop.x+sbBot.x)/2, (sbTop.y+sbBot.y)/2+3);

    // Pool outline
    const poolTL = ftToPx(-poolLen/2, -poolWid/2);
    const poolBR = ftToPx(poolLen/2, poolWid/2);
    const pw = poolBR.x-poolTL.x, ph = poolBR.y-poolTL.y;
    ctx.fillStyle = poolColor+"cc";
    ctx.beginPath();
    if (poolShape==="oval"||poolShape==="freeform"||poolShape==="figure8") {
      ctx.ellipse((poolTL.x+poolBR.x)/2,(poolTL.y+poolBR.y)/2, pw/2, ph/2, 0,0,Math.PI*2);
    } else { ctx.roundRect(poolTL.x, poolTL.y, pw, ph, 6); }
    ctx.fill();
    ctx.strokeStyle = "#0c4a6e"; ctx.lineWidth = 2; ctx.stroke();
    // Coping ring
    ctx.strokeStyle = "rgba(180,150,110,0.9)"; ctx.lineWidth = 5;
    ctx.beginPath();
    if (poolShape==="oval"||poolShape==="freeform"||poolShape==="figure8") ctx.ellipse((poolTL.x+poolBR.x)/2,(poolTL.y+poolBR.y)/2, pw/2+3, ph/2+3, 0,0,Math.PI*2);
    else ctx.roundRect(poolTL.x-3, poolTL.y-3, pw+6, ph+6, 8);
    ctx.stroke();

    // Dimension lines: width (top), length (right side)
    const dimOffset = 28;
    const drawDim = (x1,y1,x2,y2,label) => {
      ctx.strokeStyle = "#1e293b"; ctx.fillStyle = "#1e293b"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      // end ticks
      const ang = Math.atan2(y2-y1, x2-x1) + Math.PI/2;
      [[x1,y1],[x2,y2]].forEach(([tx,ty])=>{
        ctx.beginPath(); ctx.moveTo(tx+5*Math.cos(ang), ty+5*Math.sin(ang)); ctx.lineTo(tx-5*Math.cos(ang), ty-5*Math.sin(ang)); ctx.stroke();
      });
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign="center";
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = "#fff"; ctx.fillRect(mx-tw/2, my-9, tw, 18);
      ctx.fillStyle = "#1e293b"; ctx.fillText(label, mx, my+4);
    };
    drawDim(poolTL.x, poolTL.y - dimOffset, poolBR.x, poolTL.y - dimOffset, `${poolLen} ft`);
    drawDim(poolBR.x + dimOffset, poolTL.y, poolBR.x + dimOffset, poolBR.y, `${poolWid} ft`);

    // Scale bar (bottom left of drawing area)
    const sbX = 60, sbY = PH - 70, sbLenFt = 10, sbLenPx = sbLenFt*scale;
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sbX,sbY); ctx.lineTo(sbX+sbLenPx,sbY); ctx.stroke();
    [sbX, sbX+sbLenPx].forEach(x=>{ ctx.beginPath(); ctx.moveTo(x,sbY-5); ctx.lineTo(x,sbY+5); ctx.stroke(); });
    ctx.fillStyle = "#1e293b"; ctx.font = "11px Inter,sans-serif"; ctx.textAlign="left";
    ctx.fillText(`Scale: ${sbLenFt} ft`, sbX, sbY+20);

    // North arrow (bottom right)
    const naX = PW-80, naY = PH-70;
    ctx.strokeStyle="#1e293b"; ctx.fillStyle="#1e293b"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(naX,naY+18); ctx.lineTo(naX,naY-10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(naX,naY-14); ctx.lineTo(naX-5,naY-6); ctx.lineTo(naX+5,naY-6); ctx.closePath(); ctx.fill();
    ctx.font="bold 12px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("N", naX, naY-18);

    const dataUrl = drawCanvas.toDataURL("image/png");
    const win = window.open("","_blank"); if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Pool Craft Pro - Scaled Site Plan</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box} body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#1e293b;padding:30px}
      .titleblock{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e293b;padding-bottom:14px;margin-bottom:16px}
      .titleblock h1{font-size:18px;font-weight:800} .titleblock .sub{font-size:12px;color:#64748b;margin-top:2px}
      .drawing{width:100%;border:1px solid #e2e8f0;border-radius:8px}
      .specs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}
      .spec{border:1px solid #e2e8f0;border-radius:8px;padding:10px}.spec label{font-size:10px;color:#94a3b8;text-transform:uppercase;display:block;margin-bottom:3px}
      .spec span{font-size:13px;font-weight:700}
      .footer{margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;line-height:1.6}
      @media print{body{padding:10px}}
    </style></head><body>
      <div class="titleblock">
        <div><h1>POOL CRAFT PRO — Scaled Site Plan</h1><div class="sub">${parcelData?.address || "Property address not yet entered"}</div></div>
        <div style="text-align:right"><div class="sub">Generated ${new Date().toLocaleDateString()}</div><div class="sub">Drawing not to engineering scale - reference only</div></div>
      </div>
      <img class="drawing" src="${dataUrl}" />
      <div class="specs">
        <div class="spec"><label>Pool Dimensions</label><span>${poolLen}' x ${poolWid}'</span></div>
        <div class="spec"><label>Shape</label><span>${POOL_SHAPES.find(s=>s.id===poolShape)?.label||poolShape}</span></div>
        <div class="spec"><label>Parcel / APN</label><span>${parcelData?.parcel||"Not looked up"}</span></div>
        <div class="spec"><label>Front Setback Shown</label><span>20 ft (verify locally)</span></div>
      </div>
      <div class="footer">This drawing is a proportional site plan generated for early planning and discussion purposes. It is <strong>not</strong> a surveyed or engineer-stamped document. All dimensions, setbacks, and property boundaries must be verified by a licensed surveyor and your local building department before permit submission. Generated by Pool Craft Pro · Design Pools. Craft Outdoor Living..</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),600);</script>
    </body></html>`);
    win.document.close();
  };

  const isOk=()=>{const px=poolPos.x*CW,py=poolPos.y*CH;return px-POOL_W/2>=SB_SIDE&&px+POOL_W/2<=CW-SB_SIDE&&py-POOL_H/2>=SB_FRONT&&py+POOL_H/2<=CH-SB_REAR;};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {coords && mapLoaded ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:700,color:"#22c55e"}}>✅ Google Maps Satellite - Active</div>
        </div>
      ) : coords && mapError ? (
        <div style={{padding:"10px 14px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:10,fontSize:12,fontWeight:700,color:"#ef4444"}}>
          ⚠️ Couldn't load satellite imagery - check the server's GOOGLE_MAPS_KEY
        </div>
      ) : null}

      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button onClick={()=>setShowSetbacks(p=>!p)} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:`2px solid ${showSetbacks?"#f59e0b88":"#334155"}`,background:showSetbacks?"rgba(245,158,11,0.1)":"#111827",color:showSetbacks?"#f59e0b":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>📐 Setbacks {showSetbacks?"On":"Off"}</button>
        <button onClick={()=>setShowMeasure(p=>!p)} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:`2px solid ${showMeasure?"#22c55e88":"#334155"}`,background:showMeasure?"rgba(34,197,94,0.1)":"#111827",color:showMeasure?"#22c55e":"#64748b",fontSize:12,fontWeight:700,cursor:"pointer"}}>📏 Measurements {showMeasure?"On":"Off"}</button>
        {coords&&<>
          <button onClick={()=>setZoom(z=>Math.min(21,z+1))} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          <button onClick={()=>setZoom(z=>Math.max(16,z-1))} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
        </>}
        <button onClick={printMap} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:"2px solid rgba(167,139,250,0.4)",background:"rgba(167,139,250,0.1)",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer",marginLeft:"auto"}}>🖨️ Print Map View</button>
        <button onClick={printScaledSitePlan} style={{padding:"10px 14px",minHeight:40,borderRadius:8,border:"2px solid rgba(34,197,94,0.4)",background:"rgba(34,197,94,0.1)",color:"#22c55e",fontSize:12,fontWeight:700,cursor:"pointer"}}>📐 Dimensioned Site Plan</button>
      </div>

      <div style={{borderRadius:14,overflow:"hidden",border:"2px solid #334155",boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
        <canvas ref={canvasRef} width={CW} height={CH}
          style={{display:"block",width:"100%",cursor:dragging?"grabbing":"grab",touchAction:"none"}}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}/>
      </div>

      <div style={{padding:"10px 14px",borderRadius:10,background:isOk()?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${isOk()?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,fontSize:13,color:isOk()?"#22c55e":"#ef4444",fontWeight:700}}>
        {isOk()?"✅ Pool placement within all setback requirements - ready for permit submission":"⚠️ Pool overlaps a setback zone - drag to adjust before submitting permits"}
      </div>

      {parcelData&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
          {[{label:"Front Setback",val:parcelData.setback_front},{label:"Rear Setback",val:parcelData.setback_rear},{label:"Side Setback",val:parcelData.setback_side},{label:"Pool Setback",val:parcelData.pool_setback}].map(s=>(
            <div key={s.label} style={{background:"#1e293b",borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>{s.label}</div>
              <div style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{s.val}</div>
            </div>
          ))}
        </div>
      )}
      <RegridKeyPanel />
      <div style={{fontSize:11,color:"#334155",textAlign:"center"}}>
        {mapLoaded?"🛰️ Satellite (c) Google Maps - Geocoding (c) OpenStreetMap":"🗺️ Search an address above to load real satellite imagery"}
      </div>
    </div>
  );
}

// ─── AI RENDERING COMPONENT ───────────────────────────────────────────────────
function AIRenderingPanel({ bgPhoto, setBgPhoto, shape, poolColor, len, wid, finish, colorId, entries, hardscapes, dailyRenders=0, dailyLimit=10, onRenderComplete=()=>{} }) {
  const [rendering, setRendering] = useState(false);
  const [renderedImage, setRenderedImage] = useState(null);
  const [userTweak, setUserTweak] = useState("");
  const [renderCount, setRenderCount] = useState(() => { try { return parseInt(localStorage.getItem("pc_renders")||"0"); } catch { return 0; } });
  const [monthlyRenders, setMonthlyRenders] = useState(() => { try { return parseInt(localStorage.getItem("pc_month_renders")||"0"); } catch { return 0; } });
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("photorealistic");
  const [aiDescription, setAiDescription] = useState(null);
  const [apiKey, setApiKey] = useState(() => { if(import.meta.env.VITE_XAI_KEY) return import.meta.env.VITE_XAI_KEY; try { return localStorage.getItem("xai_dev_key") || ""; } catch { return ""; } });
  const [keyInput, setKeyInput] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [queued, setQueued] = useState(false);

  const MONTHLY_LIMIT = 30;
  const activeEntries = ENTRY_FEATURES.filter(e => entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h => hardscapes[h.id]);
  const hasKey = !!apiKey.trim();

  const STYLES = [
    { id:"photorealistic", label:"📷 Photorealistic",  hint:"Natural daylight - most realistic" },
    { id:"twilight",       label:"🌅 Twilight / Dusk",  hint:"Golden hour warm sunset glow" },
    { id:"night",          label:"🌙 Night Lit",         hint:"Dramatic LED pool lighting at night" },
    { id:"aerial",         label:"🚁 Aerial / Drone",    hint:"Overhead bird's-eye perspective" },
    { id:"magazine",       label:"✨ Magazine",          hint:"Luxury design editorial look" },
  ];

  const buildPrompt = () => {
    const finishLabel = POOL_FINISHES.find(f=>f.id===finish)?.label || finish;
    const colorLabel  = POOL_COLORS.find(c=>c.id===colorId)?.label  || colorId;
    const featureList = activeEntries.map(e=>e.label).join(", ");
    const hardList    = activeHardscapes.map(h=>h.label).join(", ");
    const styleMap = {
      photorealistic: "natural daylight, ultra-photorealistic architectural photography, match existing lighting and shadows precisely",
      twilight:       "golden dusk lighting, warm orange-pink sky, cinematic atmosphere, long shadows",
      night:          "nighttime scene, glowing pool LED lights, reflections on water, ambient garden lighting, dark sky",
      aerial:         "drone aerial overhead view, looking straight down, birds-eye perspective, wide angle",
      magazine:       "luxury architectural design magazine, aspirational lifestyle photography, perfectly composed, soft editorial light",
    };
    let p = `Edit this backyard photo to add a realistic ${shape}-shaped swimming pool, ${len} feet long by ${wid} feet wide. The pool has ${colorLabel} crystal clear water with a ${finishLabel} interior finish.`;
    if (featureList) p += ` Include these pool features: ${featureList}.`;
    if (hardList)    p += ` Also add: ${hardList}.`;
    p += ` The pool must look completely natural and permanently built into this exact space - correct perspective, matching ground materials, realistic shadows, proper depth, and realistic water reflections. ${styleMap[selectedStyle]}. Photorealistic result, ultra HD, the pool should look like it was professionally built here years ago.`;
    if (userTweak.trim()) p += ` Additional instructions: ${userTweak.trim()}.`;
    return p;
  };

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    setApiKey(k);
    try { localStorage.setItem("xai_dev_key", k); } catch {}
    setShowSetup(false); setKeyInput(""); setError(null);
  };
  const removeKey = () => { setApiKey(""); setKeyInput(""); try { localStorage.removeItem("xai_dev_key"); } catch {} };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Photo is too large (over 8MB). Please use a smaller photo or compress it first."); return; }
    const reader = new FileReader();
    reader.onload = ev => { setBgPhoto(ev.target.result); setRenderedImage(null); setAiDescription(null); setError(null); };
    reader.readAsDataURL(file);
  };

  const getAIDescription = async (prompt) => {
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:240,
          messages:[{role:"user",content:`You are a luxury pool designer. In 2-3 enthusiastic sentences, describe this pool design to an excited homeowner: ${prompt.slice(0,300)}`}]
        })
      });
      const d = await resp.json();
      return d?.content?.[0]?.text || null;
    } catch { return null; }
  };

  const handleRender = async () => {
    if (!hasKey) { setShowSetup(true); return; }
    if (!bgPhoto) { setError("Please upload a backyard photo first. Grok edits your real photo - it needs to see the actual space."); return; }

    setRendering(true); setQueued(false); setError(null);
    setProgress(0); setProgressMsg("Queuing render request..."); setRenderedImage(null); setAiDescription(null);

    const steps = [
      [8,  "Sending photo to Grok Aurora..."], [20, "Grok is analyzing your backyard..."],
      [38, "Placing pool at correct perspective..."], [55, "Rendering water, light & reflections..."],
      [70, "Matching shadows & ground texture..."], [84, "Polishing photorealistic details..."], [95, "Almost done..."],
    ];
    let si = 0;
    const interval = setInterval(()=>{ if(si < steps.length){ setProgress(steps[si][0]); setProgressMsg(steps[si][1]); si++; } }, 2800);

    try {
      const b64 = bgPhoto.split(",")[1];
      const mediaType = bgPhoto.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const prompt = buildPrompt();

      const resp = await fetch("https://api.x.ai/v1/images/edits", {
        method:"POST", headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ model: "grok-imagine-image-quality", prompt, image: { b64_json: b64, media_type: mediaType }, response_format: "b64_json", n: 1 }),
      });

      clearInterval(interval);

      if (!resp.ok) {
        const txt = await resp.text().catch(()=>"");
        let parsed = {}; try { parsed = JSON.parse(txt); } catch {}
        const msg = parsed?.error?.message || txt.slice(0,140);
        if (resp.status === 401) throw new Error("API key invalid or expired. Go to console.x.ai then API Keys and create a new key.");
        if (resp.status === 429) { setQueued(true); throw new Error("Rate limit reached - wait 60 seconds and try again."); }
        if (resp.status === 400) throw new Error(`Bad request: ${msg}. Try a smaller photo (under 4MB) or a different image format.`);
        throw new Error(`Grok API error ${resp.status}: ${msg}`);
      }

      const data = await resp.json();
      const b64Result = data?.data?.[0]?.b64_json;
      const urlResult = data?.data?.[0]?.url;
      if (!b64Result && !urlResult) throw new Error("Grok returned no image. Please try again.");

      setProgress(100); setProgressMsg("Done!");
      const finalImg = b64Result ? `data:image/jpeg;base64,${b64Result}` : urlResult;
      setRenderedImage(finalImg);

      const newTotal = renderCount + 1;
      const newMonthly = monthlyRenders + 1;
      setRenderCount(newTotal); setMonthlyRenders(newMonthly);
      try { localStorage.setItem("pc_renders", newTotal); localStorage.setItem("pc_month_renders", newMonthly); } catch {}

      getAIDescription(prompt).then(d=>setAiDescription(d));
      onRenderComplete();
    } catch(err) {
      clearInterval(interval);
      setError(err.message || "Something went wrong - please try again.");
    } finally { setRendering(false); }
  };

  const handleRefresh = () => { setRenderedImage(null); setAiDescription(null); setError(null); setQueued(false); setTimeout(handleRender, 80); };

  const QUICK_TWEAKS = [
    "tropical palm trees and lush landscaping", "outdoor fire pit with lounge seating", "pergola with climbing vines and shade",
    "outdoor kitchen and wet bar area", "natural rock waterfall cascading in", "string lights for evening ambiance",
    "travertine stone deck and coping", "privacy hedge and mature landscaping", "putting green alongside the pool", "sun shelf with patio umbrella",
  ];

  const finishLink = FINISH_LINKS[finish];
  const colorLink  = COLOR_LINKS[colorId];
  const entryLinks = activeEntries.map(e=>ENTRY_LINKS[e.id]).filter(Boolean);
  const hardLinks  = activeHardscapes.map(h=>HARDSCAPE_LINKS[h.id]).filter(Boolean);
  const allLinks   = [finishLink, colorLink, ...entryLinks, ...hardLinks].filter(Boolean);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!hasKey ? (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,overflow:"hidden"}}>
          <div style={{background:"linear-gradient(135deg,#4c1d95,#2d1b69)",padding:"16px 18px"}}>
            <div style={{fontSize:15,fontWeight:800,color:"#e9d5ff",marginBottom:4}}>🚀 Grok Aurora AI Rendering</div>
            <div style={{fontSize:12,color:"#c4b5fd",lineHeight:1.6}}>The same Aurora AI you use in Super Grok - photorealistically renders your pool into a real backyard photo. Setup takes 2 minutes and only needs to be done once.</div>
          </div>
          <div style={{padding:16}}>
            <div style={{marginBottom:14}}>
              {[
                {n:1, title:"Create a free xAI Developer Account", detail:"Go to console.x.ai - this is SEPARATE from your Super Grok. No daily caps here - you pay $0.02-$0.07 per image generated."},
                {n:2, title:"Get $25 free credits on signup", detail:"New developer accounts get $25 in free API credits instantly - that's 350-1,200 free renders before you pay anything."},
                {n:3, title:"Create an API Key", detail:"In the console: API Keys then Create Key. Copy the key starting with \"xai-...\""},
                {n:4, title:"Paste it below", detail:"Saved to your device only. Your customers never see it."},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}}>
                  <div style={{minWidth:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#5b21b6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"white",flexShrink:0}}>{s.n}</div>
                  <div><div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:2}}>{s.title}</div><div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{s.detail}</div></div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input type="password" value={keyInput} onChange={e=>setKeyInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveKey()}
                placeholder="Paste xAI API key (xai-...)" style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"12px 14px",color:"#e2e8f0",fontSize:14,outline:"none"}} />
              <button onClick={saveKey} disabled={!keyInput.trim()}
                style={{padding:"12px 20px",borderRadius:10,background:keyInput.trim()?"linear-gradient(135deg,#7c3aed,#5b21b6)":"#1e293b",border:"none",color:"white",fontWeight:800,fontSize:14,cursor:keyInput.trim()?"pointer":"not-allowed",flexShrink:0}}>Activate</button>
            </div>
            <div style={{marginTop:10,padding:"10px 12px",background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:8,fontSize:11,color:"#94a3b8",lineHeight:1.6}}>
              💼 <strong style={{color:"#e2e8f0"}}>For your launched app:</strong> embed the key server-side so customers just tap Generate. Contact xAI sales as you scale for higher rate limits and volume pricing.
            </div>
          </div>
        </div>
      ) : (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
            <div><div style={{fontSize:13,fontWeight:800,color:"#22c55e"}}>✅ Grok Aurora API - Active</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>xAI Developer API - Pay-per-render - No daily cap</div></div>
            <button onClick={removeKey} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Change Key</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[{label:"Renders This Month", val:monthlyRenders, of:MONTHLY_LIMIT, color:"#06b6d4"},{label:"Total Renders", val:renderCount, of:null, color:"#a78bfa"},{label:"Est. API Cost", val:`$${(monthlyRenders*0.07).toFixed(2)}`, of:null, color:"#22c55e"}].map(s=>(
              <div key={s.label} style={{background:"#1e293b",borderRadius:8,padding:"9px 10px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{s.label}</div>
                <div style={{fontSize:17,fontWeight:800,color:s.color}}>{s.val}{s.of?<span style={{fontSize:11,color:"#64748b",fontWeight:400}}> / {s.of}</span>:""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:12}}>
        <div style={{fontSize:11,color:"#f59e0b",fontWeight:700,marginBottom:4}}>⚠️ Important: Developer API vs Super Grok</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>
          Your Super Grok subscription has a daily render cap. The <strong style={{color:"#e2e8f0"}}>xAI Developer API</strong> (console.x.ai) is completely separate - no daily cap, pay per image. This is what your app needs to serve multiple customers simultaneously.
        </div>
      </div>

      <div style={{background:"#0f172a",border:`2px solid ${bgPhoto?"rgba(34,197,94,0.4)":"rgba(6,182,212,0.2)"}`,borderRadius:14,padding:14}}>
        <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>📸 Backyard Photo - Required</div>
        <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>Grok edits your actual photo - the pool is rendered realistically into your real space matching lighting, perspective & shadows. Keep photos under 8MB.</div>
        <div style={{display:"flex",gap:8}}>
          <label style={{flex:1,padding:"13px 0",borderRadius:10,background:bgPhoto?"rgba(34,197,94,0.1)":"rgba(6,182,212,0.08)",border:`1px solid ${bgPhoto?"rgba(34,197,94,0.35)":"rgba(6,182,212,0.2)"}`,color:bgPhoto?"#22c55e":"#06b6d4",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            {bgPhoto?"✅ Photo ready - tap to change":"📁 Upload Backyard Photo"}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}} />
          </label>
          <label style={{padding:"13px 18px",borderRadius:10,background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",color:"#06b6d4",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",flexShrink:0}}>
            📷<input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{display:"none"}} />
          </label>
          {bgPhoto&&<button onClick={()=>{setBgPhoto(null);setRenderedImage(null);setError(null);}} style={{padding:"13px 14px",borderRadius:10,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,cursor:"pointer"}}>✕</button>}
        </div>
        {bgPhoto&&(
          <div style={{marginTop:10,borderRadius:10,overflow:"hidden",border:"1px solid rgba(34,197,94,0.3)"}}>
            <img src={bgPhoto} alt="backyard" style={{width:"100%",display:"block",maxHeight:200,objectFit:"cover"}} />
            <div style={{background:"rgba(34,197,94,0.8)",padding:"5px 12px",fontSize:12,color:"white",fontWeight:700}}>✅ Aurora will render your pool into this exact space</div>
          </div>
        )}
      </div>

      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>🎨 Rendering Style</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {STYLES.map(s=>(
            <button key={s.id} onClick={()=>setSelectedStyle(s.id)}
              style={{textAlign:"left",padding:"10px 14px",borderRadius:10,border:`2px solid ${selectedStyle===s.id?"#7c3aed":"#1e293b"}`,background:selectedStyle===s.id?"rgba(124,58,237,0.08)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontWeight:700,fontSize:13,color:selectedStyle===s.id?"#a78bfa":"#e2e8f0"}}>{s.label}</span>
              <span style={{fontSize:11,color:"#64748b"}}>- {s.hint}</span>
              {selectedStyle===s.id&&<span style={{marginLeft:"auto",color:"#a78bfa",fontWeight:800,fontSize:14}}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>✍️ Tell Grok What to Add</div>
        <textarea value={userTweak} onChange={e=>setUserTweak(e.target.value)}
          placeholder="e.g. 'add a natural rock waterfall on the left side with tropical palms and a fire pit in the back right corner'" rows={3}
          style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 12px",color:"#e2e8f0",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.6,fontFamily:"inherit"}} />
        <div style={{marginTop:10}}>
          <div style={{fontSize:10,color:"#64748b",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Quick add →</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {QUICK_TWEAKS.map(qt=>(<button key={qt} onClick={()=>setUserTweak(p=>p?p+", "+qt:qt)} style={{padding:"5px 10px",borderRadius:20,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontSize:11,cursor:"pointer"}}>+ {qt}</button>))}
          </div>
        </div>
      </div>

      {dailyRenders >= dailyLimit && (
        <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:14,padding:16,textAlign:"center"}}>
          <div style={{fontSize:16,marginBottom:6}}>⏰</div>
          <div style={{fontSize:14,fontWeight:700,color:"#ef4444",marginBottom:4}}>Daily Render Limit Reached</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:4}}>You've used all {dailyLimit} renders for today - pool and hardscape renders share this limit.</div>
          <div style={{fontSize:11,color:"#64748b"}}>Resets at midnight. Contact us to upgrade for more daily renders.</div>
        </div>
      )}

      <button onClick={rendering||dailyRenders>=dailyLimit?null:handleRender}
        style={{width:"100%",padding:"17px",borderRadius:12,background:rendering?"#1e293b":hasKey?"linear-gradient(135deg,#7c3aed,#5b21b6)":"linear-gradient(135deg,#334155,#1e293b)",
          border:"none",color:"white",fontWeight:800,fontSize:16,cursor:rendering?"not-allowed":"pointer",boxShadow:hasKey&&!rendering?"0 4px 24px rgba(124,58,237,0.35)":"none",letterSpacing:"0.02em",transition:"all 0.2s"}}>
        {rendering ? `⏳ ${progressMsg}` : hasKey ? (renderedImage ? "🔄 Generate New Variation" : "🚀 Generate with Grok Aurora") : "🔑 Activate Grok API to Generate"}
      </button>

      {rendering&&(
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:12,color:"#a78bfa",fontWeight:600}}>{progressMsg}</span><span style={{fontSize:12,color:"#64748b"}}>{progress}%</span></div>
          <div style={{height:6,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#7c3aed,#a78bfa,#06b6d4)",borderRadius:3,transition:"width 2.5s ease"}} /></div>
          <div style={{marginTop:16,textAlign:"center"}}><div style={{fontSize:36}}>🚀</div><div style={{fontSize:13,color:"#a78bfa",marginTop:6,fontWeight:600}}>Grok Aurora is working on your render...</div><div style={{fontSize:11,color:"#64748b",marginTop:3}}>Photo-realistic results take 20-45 seconds</div></div>
        </div>
      )}

      {error&&!rendering&&(
        <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,padding:14}}>
          <div style={{fontSize:13,color:"#ef4444",fontWeight:700,marginBottom:8}}>⚠️ {error}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {hasKey&&bgPhoto&&!queued&&<button onClick={handleRefresh} style={{padding:"8px 14px",borderRadius:8,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.25)",color:"#a78bfa",fontWeight:700,fontSize:12,cursor:"pointer"}}>🔄 Try Again</button>}
            {queued&&<div style={{fontSize:12,color:"#f59e0b",padding:"8px 0"}}>⏰ Wait 60 seconds then try again.</div>}
            <button onClick={()=>{removeKey();setShowSetup(true);}} style={{padding:"8px 14px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,fontSize:12,cursor:"pointer"}}>🔑 Re-enter API Key</button>
          </div>
        </div>
      )}

      {renderedImage&&!rendering&&(
        <div style={{background:"#0f172a",border:"2px solid rgba(124,58,237,0.35)",borderRadius:16,overflow:"hidden",boxShadow:"0 8px 40px rgba(124,58,237,0.18)"}}>
          <div style={{position:"relative"}}>
            <img src={renderedImage} alt="Grok Aurora pool rendering" style={{width:"100%",display:"block"}} />
            <div style={{position:"absolute",top:10,left:10,background:"rgba(124,58,237,0.92)",borderRadius:8,padding:"5px 12px",fontSize:11,color:"white",fontWeight:700}}>🚀 Grok Aurora - Render #{renderCount}</div>
            <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.6)",borderRadius:8,padding:"5px 10px",fontSize:10,color:"#94a3b8"}}>Pool Craft Pro</div>
          </div>
          {aiDescription&&(
            <div style={{padding:"14px 16px",background:"rgba(124,58,237,0.06)",borderTop:"1px solid rgba(124,58,237,0.15)"}}>
              <div style={{fontSize:10,color:"#a78bfa",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>🤖 AI Designer Notes</div>
              <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.65,fontStyle:"italic"}}>{aiDescription}</div>
            </div>
          )}
          <div style={{padding:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <button onClick={handleRefresh} style={{padding:"12px",borderRadius:10,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.3)",color:"#a78bfa",fontWeight:700,fontSize:13,cursor:"pointer"}}>🔄 New Variation</button>
              <a href={renderedImage} download={`poolcraft-aurora-${renderCount}.jpg`} style={{padding:"12px",borderRadius:10,background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontWeight:700,fontSize:13,textDecoration:"none",textAlign:"center",display:"block"}}>⬇️ Save Image</a>
            </div>
            <div style={{fontSize:11,color:"#334155",textAlign:"center"}}>{len}' x {wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} - {STYLES.find(s=>s.id===selectedStyle)?.label}</div>
          </div>
        </div>
      )}

      {allLinks.length>0&&(
        <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.1),rgba(217,119,6,0.05))",border:"1px solid rgba(245,158,11,0.22)",borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:800,color:"#f59e0b",marginBottom:10}}>🛒 Shop Everything in This Design</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {allLinks.map((item,i)=>{
              const rc=RETAILER_COLORS[item.retailer]||{bg:"rgba(100,116,139,0.1)",border:"rgba(100,116,139,0.3)",text:"#94a3b8"};
              return(
                <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",borderRadius:10,background:"#111827",border:"1px solid #1e293b",textDecoration:"none",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                    <div style={{display:"flex",gap:6,marginTop:4,alignItems:"center"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,background:rc.bg,border:`1px solid ${rc.border}`,color:rc.text,fontSize:10,fontWeight:700}}>{item.retailer}</span>
                      <span style={{fontSize:10,color:"#64748b"}}>You earn {item.earn}</span>
                    </div>
                  </div>
                  <span style={{fontSize:18,color:"#f59e0b",flexShrink:0}}>→</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
const FEATURE_DETAILS = {
  beach_entry:"Beach entry pools have a gradual zero-depth slope that transitions from the pool deck directly into the water. Popular for families with young children and older adults. Requires extra excavation and shotcrete work at the shallow end.",
  baja_shelf:"Also called a tanning ledge or sun shelf. A raised platform of 6-12 inches of water, typically 12-18 inches below the main deck. Chairs and tables sit directly in the water.",
  steps_corner:"Traditional corner entry with 3-4 steps descending into the pool, tucked into one corner of the shallow end. Usually includes a stainless steel handrail.",
  steps_end:"Full-width steps span the entire width of the shallow end. More welcoming and accessible than corner steps. Doubles as a shallow sitting area.",
  steps_curved:"Curved Roman or Grecian steps use sweeping semicircular shapes rather than straight steps. A classic architectural detail that adds elegance and a resort feel.",
  swim_up_bar:"A counter built into the pool edge with submerged barstools so swimmers can sit at chest height in the water. Requires extra plumbing for the bar area.",
  grotto:"A cave or alcove built from natural or artificial rock, usually with a waterfall cascading over the entrance. Requires significant excavation and rock work.",
  infinity_edge:"One or more edges of the pool are level with the water surface, creating the illusion that the water extends to the horizon. A catch basin collects the overflow.",
  spa_attached:"A separate spa built adjacent to and connected with the main pool. Water from the heated, jetted spa spills over into the pool in a waterfall effect.",
  splash_pad:"A flat, ground-level play area with water jets - no standing water. Completely safe for toddlers. Requires its own plumbing, pump, and drain system.",
  diving_rock:"Natural-looking boulders or engineered rock formations integrated into the pool design as a jumping platform. Requires a minimum 8 ft deep end per most building codes.",
  sun_shelf_umbrella:"A Baja shelf with a built-in PVC sleeve anchored into the concrete during construction, allowing a standard patio umbrella to be inserted directly into the shelf.",
};

function FeatureCard({ feature, active, onToggle }) {
  const canvasRef = useRef(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    // Background gradient
    const bg = ctx.createLinearGradient(0,0,W,H);
    bg.addColorStop(0, "#0a0f1e"); bg.addColorStop(1, "#111827");
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

    // Feature-specific illustration
    const c = feature.color;
    const drawWater = (x,y,w,h,col="#1ca7c0") => {
      ctx.fillStyle=col+"99"; ctx.beginPath(); ctx.roundRect(x,y,w,h,8); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1;
      for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(x+w*i/3,y+4);ctx.bezierCurveTo(x+w*i/3+10,y,x+w*i/3+20,y+8,x+w*i/3+30,y+4);ctx.stroke();}
    };

    if(feature.id==="beach_entry"){
      // Gradual beach entry with gradient floor
      const grad=ctx.createLinearGradient(0,H*0.3,W,H*0.85);
      grad.addColorStop(0,"#c9a84c66"); grad.addColorStop(0.4,"#1ca7c099"); grad.addColorStop(1,"#1a5fa8cc");
      ctx.fillStyle=grad; ctx.beginPath(); ctx.moveTo(0,H*0.75); ctx.lineTo(W,H*0.45); ctx.lineTo(W,H*0.85); ctx.lineTo(0,H*0.85); ctx.closePath(); ctx.fill();
      // Sand ripples
      ctx.strokeStyle="rgba(201,168,76,0.3)"; ctx.lineWidth=1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(W*0.2+i*30,H*0.72-i*5,40-i*8,6,0,0,Math.PI*2);ctx.stroke();}
      // Water ripples
      ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(W*0.4+i*40,H*0.55+i*5);ctx.bezierCurveTo(W*0.5+i*40,H*0.52+i*5,W*0.55+i*40,H*0.58+i*5,W*0.65+i*40,H*0.55+i*5);ctx.stroke();}
    } else if(feature.id==="baja_shelf"){
      drawWater(W*0.05,H*0.35,W*0.9,H*0.5,"#1ca7c0");
      // Shallow shelf
      ctx.fillStyle="#c9a84c55"; ctx.beginPath(); ctx.roundRect(W*0.1,H*0.38,W*0.4,H*0.12,6); ctx.fill();
      ctx.strokeStyle="rgba(201,168,76,0.6)"; ctx.lineWidth=2; ctx.strokeRect(W*0.1,H*0.38,W*0.4,H*0.12);
      ctx.fillStyle="rgba(201,168,76,0.8)"; ctx.font="10px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Shallow Shelf 12\"",W*0.3,H*0.47);
      // Lounge chairs hint
      ctx.fillStyle=c+"88"; ctx.beginPath(); ctx.roundRect(W*0.15,H*0.4,18,8,3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(W*0.28,H*0.4,18,8,3); ctx.fill();
    } else if(feature.id==="spa_attached"){
      drawWater(W*0.1,H*0.4,W*0.8,H*0.45,"#1a5fa8");
      // Spa circle
      ctx.fillStyle="#8b5cf699"; ctx.beginPath(); ctx.arc(W*0.25,H*0.38,W*0.15,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#8b5cf6"; ctx.lineWidth=2; ctx.stroke();
      // Jets/bubbles
      for(let i=0;i<6;i++){ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(W*0.25+Math.cos(i)*W*0.1,H*0.38+Math.sin(i)*H*0.08,2,0,Math.PI*2); ctx.fill();}
      ctx.fillStyle="rgba(139,92,246,0.8)"; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("Attached Spa",W*0.25,H*0.38+3);
    } else if(feature.id==="infinity_edge"){
      drawWater(W*0.05,H*0.3,W*0.9,H*0.55,"#1ca7c0");
      // Infinity edge waterfall effect
      const inf=ctx.createLinearGradient(W*0.75,H*0.3,W*0.95,H*0.85);
      inf.addColorStop(0,"#1ca7c0cc"); inf.addColorStop(1,"transparent");
      ctx.fillStyle=inf; ctx.beginPath(); ctx.moveTo(W*0.78,H*0.3); ctx.lineTo(W*0.95,H*0.3); ctx.lineTo(W*0.9,H*0.85); ctx.lineTo(W*0.73,H*0.6); ctx.closePath(); ctx.fill();
      // Horizon line
      ctx.strokeStyle="rgba(28,167,192,0.6)"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(W*0.78,H*0.3); ctx.lineTo(W*0.95,H*0.3); ctx.stroke();
      ctx.fillStyle=c+"cc"; ctx.font="9px Inter,sans-serif"; ctx.textAlign="center"; ctx.fillText("∞ Vanishing Edge",W*0.86,H*0.26);
    } else if(feature.id==="grotto"){
      // Rock arch
      ctx.fillStyle="#4a3728cc"; ctx.beginPath(); ctx.arc(W*0.5,H*0.5,W*0.28,Math.PI,Math.PI*2); ctx.fill();
      ctx.fillStyle="#5a4738cc"; ctx.beginPath(); ctx.arc(W*0.5,H*0.52,W*0.22,Math.PI,Math.PI*2); ctx.fill();
      drawWater(W*0.25,H*0.52,W*0.5,H*0.3,"#1a5fa8");
      // Waterfall
      ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(W*0.42,H*0.32); ctx.quadraticCurveTo(W*0.44,H*0.42,W*0.42,H*0.52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W*0.5,H*0.3); ctx.quadraticCurveTo(W*0.5,H*0.41,W*0.5,H*0.52); ctx.stroke();
    } else if(feature.id==="waterfall"){
      drawWater(W*0.1,H*0.5,W*0.8,H*0.38,"#1ca7c0");
      // Rock formation
      ctx.fillStyle="#5a4738"; ctx.beginPath(); ctx.roundRect(W*0.3,H*0.25,W*0.4,H*0.28,4); ctx.fill();
      ctx.fillStyle="#6a5748"; ctx.beginPath(); ctx.roundRect(W*0.35,H*0.2,W*0.3,H*0.1,4); ctx.fill();
      // Water streams
      ctx.strokeStyle="rgba(28,167,192,0.7)"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(W*0.4,H*0.35); ctx.quadraticCurveTo(W*0.38,H*0.44,W*0.4,H*0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W*0.5,H*0.33); ctx.quadraticCurveTo(W*0.5,H*0.43,W*0.5,H*0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W*0.6,H*0.35); ctx.quadraticCurveTo(W*0.62,H*0.44,W*0.6,H*0.5); ctx.stroke();
    } else if(feature.id==="diving_rock"){
      drawWater(W*0.05,H*0.45,W*0.9,H*0.45,"#1a5fa8");
      // Natural rock
      ctx.fillStyle="#6b5a4a"; ctx.beginPath(); ctx.moveTo(W*0.3,H*0.45); ctx.lineTo(W*0.2,H*0.55); ctx.lineTo(W*0.1,H*0.65); ctx.lineTo(W*0.05,H*0.65); ctx.lineTo(W*0.05,H*0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle="#7b6a5a"; ctx.beginPath(); ctx.moveTo(W*0.28,H*0.3); ctx.lineTo(W*0.38,H*0.45); ctx.lineTo(W*0.18,H*0.45); ctx.closePath(); ctx.fill();
      // Person silhouette hint
      ctx.fillStyle=c+"88"; ctx.beginPath(); ctx.arc(W*0.32,H*0.24,6,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=c+"88"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W*0.32,H*0.3); ctx.lineTo(W*0.32,H*0.4); ctx.moveTo(W*0.24,H*0.34); ctx.lineTo(W*0.4,H*0.34); ctx.stroke();
    } else if(feature.id==="swim_up_bar"){
      drawWater(W*0.05,H*0.4,W*0.9,H*0.48,"#1ca7c0");
      // Bar counter
      ctx.fillStyle="#8b6914cc"; ctx.beginPath(); ctx.roundRect(W*0.15,H*0.38,W*0.7,H*0.12,4); ctx.fill();
      ctx.strokeStyle="rgba(201,168,76,0.6)"; ctx.lineWidth=2; ctx.strokeRect(W*0.15,H*0.38,W*0.7,H*0.12);
      // Bar stools
      for(let i=0;i<4;i++){ctx.fillStyle=c+"88"; ctx.beginPath(); ctx.arc(W*0.25+i*W*0.16,H*0.52,6,0,Math.PI*2); ctx.fill();}
      // Glasses
      ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.roundRect(W*0.3,H*0.34,8,10,2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(W*0.5,H*0.34,8,10,2); ctx.fill();
    } else if(feature.id==="tanning_ledge"){
      drawWater(W*0.05,H*0.35,W*0.9,H*0.52,"#1ca7c0");
      // Ledge
      ctx.fillStyle="#c9a84c44"; ctx.beginPath(); ctx.roundRect(W*0.08,H*0.38,W*0.84,H*0.08,4); ctx.fill();
      ctx.strokeStyle="rgba(201,168,76,0.5)"; ctx.lineWidth=1.5; ctx.strokeRect(W*0.08,H*0.38,W*0.84,H*0.08);
      // Loungers
      for(let i=0;i<2;i++){ctx.fillStyle=c+"66"; ctx.beginPath(); ctx.roundRect(W*0.2+i*W*0.4,H*0.39,W*0.2,H*0.05,3); ctx.fill();}
      ctx.fillStyle="rgba(201,168,76,0.7)"; ctx.font="9px Inter"; ctx.textAlign="center"; ctx.fillText("6\" Depth",W*0.5,H*0.55);
    } else if(feature.id==="fire_feature"){
      drawWater(W*0.05,H*0.45,W*0.9,H*0.45,"#1a5fa8");
      // Fire bowls on edge
      for(let i=0;i<2;i++){
        const fx=W*(0.2+i*0.6), fy=H*0.38;
        ctx.fillStyle="#555"; ctx.beginPath(); ctx.roundRect(fx-10,fy,20,12,3); ctx.fill();
        // Flame
        const flame=ctx.createRadialGradient(fx,fy,0,fx,fy,18);
        flame.addColorStop(0,"#fff3"); flame.addColorStop(0.4,"#f59e0bcc"); flame.addColorStop(1,"transparent");
        ctx.fillStyle=flame; ctx.beginPath(); ctx.ellipse(fx,fy-5,10,18,0,0,Math.PI*2); ctx.fill();
      }
    } else if(feature.id==="water_feature"){
      drawWater(W*0.1,H*0.4,W*0.8,H*0.48,"#1ca7c0");
      // Deck jets
      for(let i=0;i<3;i++){
        ctx.strokeStyle=c+"aa"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(W*0.2+i*W*0.25,H*0.38); ctx.quadraticCurveTo(W*0.28+i*W*0.25,H*0.44,W*0.3+i*W*0.25,H*0.5); ctx.stroke();
        // Splash
        ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(W*0.3+i*W*0.25,H*0.5,4,0,Math.PI*2); ctx.fill();
      }
    } else if(feature.id==="slide"){
      drawWater(W*0.1,H*0.5,W*0.8,H*0.38,"#1ca7c0");
      // Slide structure
      ctx.strokeStyle=c; ctx.lineWidth=8; ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(W*0.7,H*0.15); ctx.quadraticCurveTo(W*0.8,H*0.35,W*0.65,H*0.5); ctx.stroke();
      ctx.strokeStyle=c+"55"; ctx.lineWidth=12;
      ctx.beginPath(); ctx.moveTo(W*0.7,H*0.15); ctx.quadraticCurveTo(W*0.8,H*0.35,W*0.65,H*0.5); ctx.stroke();
      // Support poles
      ctx.strokeStyle="#888"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(W*0.72,H*0.15); ctx.lineTo(W*0.72,H*0.5); ctx.stroke();
    } else {
      // Generic fallback
      const gf=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.4);
      gf.addColorStop(0,c+"33"); gf.addColorStop(1,"transparent");
      ctx.fillStyle=gf; ctx.fillRect(0,0,W,H);
      drawWater(W*0.1,H*0.4,W*0.8,H*0.45,"#1ca7c0");
    }

    // Overlay: feature name at bottom
    const labelGrad=ctx.createLinearGradient(0,H*0.7,0,H);
    labelGrad.addColorStop(0,"transparent"); labelGrad.addColorStop(1,"rgba(0,0,0,0.75)");
    ctx.fillStyle=labelGrad; ctx.fillRect(0,H*0.7,W,H*0.3);
    ctx.fillStyle=c; ctx.font="bold 13px Inter,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    ctx.fillText(feature.icon+" "+feature.label, W/2, H*0.92);
    ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font="10px Inter,sans-serif";
    ctx.fillText(feature.desc, W/2, H*0.97);
  }, [feature]);

  return (
    <div style={{background:"#111827",border:`2px solid ${active ? feature.color : "#1e293b"}`,borderRadius:16,overflow:"hidden",transition:"all 0.2s",boxShadow: active ? `0 0 20px ${feature.color}33` : "none"}}>
      <div style={{position:"relative", cursor:"pointer"}} onClick={()=>setExpanded(p=>!p)}>
        <canvas ref={canvasRef} width={400} height={200} style={{width:"100%", display:"block", borderRadius:"14px 14px 0 0"}} />
        <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.55)",borderRadius:6,padding:"3px 8px",fontSize:10,color:"rgba(255,255,255,0.75)"}}>{expanded ? "▲ Less" : "▼ Details"}</div>
      </div>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:15,color:active?feature.color:"#e2e8f0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              {feature.icon} {feature.label}
              {active && <span style={{fontSize:10,background:`${feature.color}33`,color:feature.color,borderRadius:20,padding:"2px 10px",fontWeight:700}}>ADDED ✓</span>}
            </div>
            <div style={{fontSize:12,color:"#64748b",marginTop:4,lineHeight:1.5}}>{feature.desc}</div>
          </div>
          <button onClick={onToggle} style={{padding:"10px 18px", borderRadius:10, border:`2px solid ${active?feature.color:"#334155"}`,background:active?`${feature.color}22`:"#1e293b",color:active?feature.color:"#94a3b8",fontWeight:800, fontSize:13, cursor:"pointer", flexShrink:0, transition:"all 0.15s",whiteSpace:"nowrap"}}>
            {active ? "✓ Added" : "+ Add"}
          </button>
        </div>
        {expanded && (
          <div style={{marginTop:12,padding:"10px 12px",background:"rgba(0,0,0,0.3)",borderRadius:10,fontSize:12,color:"#94a3b8",lineHeight:1.7}}>
            {FEATURE_DETAILS[feature.id]}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HARDSCAPE DESIGNER COMPONENT ────────────────────────────────────────────
const HARDSCAPE_CATEGORIES = [
  { id: "decking", label: "Decking", icon: "🪵", color: "#d97706", items: [
      { id:"concrete_deck",   label:"Concrete Deck",       icon:"⬜", unit:"sq ft", desc:"Poured concrete - durable and customizable" },
      { id:"travertine",      label:"Travertine Pavers",   icon:"🟫", unit:"sq ft", desc:"Natural stone - elegant and cool underfoot" },
      { id:"cool_deck",       label:"Kool Deck / Textured", icon:"🔲", unit:"sq ft", desc:"Slip-resistant textured coating - stays cool" },
      { id:"wood_composite",  label:"Composite Decking",   icon:"🪵", unit:"sq ft", desc:"Wood-look composite - low maintenance" },
  ]},
  { id: "fire", label: "Fire Features", icon: "🔥", color: "#ef4444", items: [
      { id:"fire_pit",    label:"Fire Pit",    icon:"🔥", unit:"unit", desc:"Propane or natural gas - gathering centerpiece" },
      { id:"fire_bowls",  label:"Fire Bowls",  icon:"🏺", unit:"qty",  desc:"Decorative fire bowls - dramatic accent pieces" },
  ]},
  { id: "shade", label: "Shade Structures", icon: "🏠", color: "#8b5cf6", items: [
      { id:"pergola", label:"Pergola / Shade Structure", icon:"🏠", unit:"unit", desc:"Wood or aluminum overhead structure - defines the space" },
  ]},
  { id: "walls", label: "Retaining Walls", icon: "🧱", color: "#64748b", items: [
      { id:"retaining_wall", label:"Retaining Wall", icon:"🧱", unit:"linear ft", desc:"Natural stone or block - levels the terrain" },
  ]},
  { id: "kitchen", label: "Outdoor Kitchen", icon: "🍳", color: "#0ea5e9", items: [
      { id:"outdoor_kitchen", label:"Outdoor Kitchen", icon:"🍳", unit:"unit", desc:"Built-in grill, counters, refrigerator - full outdoor cooking" },
  ]},
  { id: "landscape", label: "Landscaping", icon: "🌿", color: "#22c55e", items: [
      { id:"landscape_beds", label:"Planting Beds",      icon:"🌿", unit:"sq ft",    desc:"Landscape beds with plants, mulch, edging" },
      { id:"putting_green",  label:"Putting Green",      icon:"⛳", unit:"sq ft",    desc:"Artificial turf putting green - great for entertaining" },
      { id:"bocce",          label:"Bocce Ball Court",   icon:"🎯", unit:"unit",     desc:"Classic outdoor game court" },
  ]},
  { id: "safety", label: "Safety & Sport", icon: "🚧", color: "#f59e0b", items: [
      { id:"fence",       label:"Pool Safety Fence", icon:"🚧", unit:"linear ft", desc:"Code-required safety fence around pool" },
      { id:"sport_court", label:"Sport Court",       icon:"🏀", unit:"sq ft",    desc:"Basketball, pickleball, or multi-sport court" },
  ]},
];

function HardscapeDesigner({ hardscapes, toggleHardscape, setHSQty, dailyRenders, dailyLimit, bumpDailyRender, apiKey }) {
  const [activeCat, setActiveCat] = useState("decking");
  const [photo, setPhoto] = useState(null);
  const [rendered, setRendered] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [tweak, setTweak] = useState("");
  const [renderCount, setRenderCount] = useState(0);
  const [aiDesc, setAiDesc] = useState(null);

  const currentCat = HARDSCAPE_CATEGORIES.find(c=>c.id===activeCat) || HARDSCAPE_CATEGORIES[0];
  const totalSelected = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null).length;
  const rendersLeft = dailyLimit - dailyRenders;
  const limitHit = dailyRenders >= dailyLimit;

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]; if(!file) return;
    if(file.size > 8*1024*1024){ setError("Photo too large - keep under 8MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => { setPhoto(ev.target.result); setRendered(null); setError(null); };
    reader.readAsDataURL(file);
  };

  const handleRender = async () => {
    if(!photo){ setError("Upload a photo of your outdoor space first."); return; }
    if(totalSelected===0){ setError("Select at least one hardscape element below."); return; }
    if(limitHit){ return; }
    if(!apiKey){ setError("Add your xAI API key on the Design tab to activate."); return; }

    setRendering(true); setError(null);
    setProgress(0); setProgressMsg("Preparing your design..."); setRendered(null); setAiDesc(null);

    const steps = [[10,"Sending to Grok Aurora..."],[24,"Analyzing your outdoor space..."],[40,"Placing hardscape elements..."],[56,"Rendering materials & textures..."],[70,"Adding lighting & atmosphere..."],[85,"Polishing final details..."]];
    let si=0;
    const interval = setInterval(()=>{ if(si<steps.length){ setProgress(steps[si][0]); setProgressMsg(steps[si][1]); si++; } }, 3000);

    try {
      const selected = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
      const hsList = selected.map(h=>`${h.label}${h.unit!=="unit"?` (${hardscapes[h.id]} ${h.unit})`:""}`).join(", ");
      const styleMap = { photorealistic: "natural daylight, professional landscape architecture photography, ultra-photorealistic", twilight: "golden dusk lighting, warm sunset atmosphere, cinematic", night: "evening with outdoor lighting, warm ambient glow, dramatic night photography", magazine: "luxury landscape design magazine editorial, aspirational lifestyle, perfectly composed" };
      let prompt = `Edit this outdoor space photo to add professionally designed and built hardscape elements: ${hsList}. Everything must look completely realistic and permanently constructed. Use premium materials. ${styleMap[style]||styleMap.photorealistic}.`;
      if(tweak.trim()) prompt += ` Additional details: ${tweak.trim()}.`;

      const b64 = photo.split(",")[1];
      const mediaType = photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";

      const resp = await fetch("https://api.x.ai/v1/images/edits", {
        method:"POST", headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${apiKey}` },
        body: JSON.stringify({ model:"grok-imagine-image-quality", prompt, n:1, image:{ b64_json:b64, media_type:mediaType }, response_format:"b64_json" }),
      });

      clearInterval(interval);
      if(!resp.ok){
        const txt = await resp.text().catch(()=>""); let parsed={}; try{parsed=JSON.parse(txt);}catch{}
        const msg = parsed?.error?.message||txt.slice(0,120);
        if(resp.status===401) throw new Error("Invalid API key - check your xAI key on the Design tab.");
        if(resp.status===429) throw new Error("Rate limit - wait 60 seconds and try again.");
        throw new Error(`Grok error ${resp.status}: ${msg}`);
      }

      const data = await resp.json();
      const b64r = data?.data?.[0]?.b64_json; const urlr = data?.data?.[0]?.url;
      if(!b64r&&!urlr) throw new Error("No image returned. Please try again.");

      setProgress(100); setProgressMsg("Done!");
      const finalImg = b64r ? `data:image/jpeg;base64,${b64r}` : urlr;
      setRendered(finalImg); setRenderCount(c=>c+1); bumpDailyRender();

      try {
        const dr = await fetch("https://api.anthropic.com/v1/messages",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:220, messages:[{role:"user",content:`You are a luxury landscape designer. In 2 enthusiastic sentences, describe this outdoor design to an excited homeowner. The design includes: ${hsList}.`}] }) });
        const dd = await dr.json(); setAiDesc(dd?.content?.[0]?.text||null);
      } catch{}
    } catch(err){ clearInterval(interval); setError(err.message||"Something went wrong. Please try again."); }
    finally { setRendering(false); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"#111827",border:`2px solid ${photo?"rgba(52,211,153,0.45)":"#1e293b"}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#134e4a,#0f3d38)",padding:"14px 16px"}}>
          <div style={{fontSize:14,fontWeight:800,color:"#34d399",marginBottom:3}}>🏡 Outdoor Space Designer</div>
          <div style={{fontSize:12,color:"#6ee7b7",lineHeight:1.5}}>Upload your backyard photo - Select elements below - Grok Aurora renders everything into your real space</div>
        </div>
        <div style={{padding:14}}>
          <div style={{display:"flex",gap:8,marginBottom:photo?10:0}}>
            <label style={{flex:1,padding:"13px 0",borderRadius:11,background:photo?"rgba(52,211,153,0.1)":"rgba(52,211,153,0.06)",border:`1.5px solid ${photo?"rgba(52,211,153,0.45)":"rgba(52,211,153,0.2)"}`,color:photo?"#34d399":"#6ee7b7",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {photo?"✅ Photo loaded - tap to change":"📁 Upload Backyard Photo"}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}} />
            </label>
            {photo&&<button onClick={()=>{setPhoto(null);setRendered(null);setError(null);}} style={{padding:"13px 14px",borderRadius:11,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,cursor:"pointer"}}>✕</button>}
          </div>
          {photo&&<div style={{borderRadius:10,overflow:"hidden",border:"1px solid rgba(52,211,153,0.3)"}}><img src={photo} alt="outdoor space" style={{width:"100%",display:"block",maxHeight:200,objectFit:"cover"}} /></div>}
        </div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,overflow:"hidden"}}>
        <div style={{display:"flex",overflowX:"auto",borderBottom:"1px solid #1e293b",background:"#0f172a"}}>
          {HARDSCAPE_CATEGORIES.map(cat=>{
            const catSelected = cat.items.filter(item=>hardscapes[item.id]!=null).length;
            const isActive = activeCat===cat.id;
            return(
              <button key={cat.id} onClick={()=>setActiveCat(cat.id)} style={{flexShrink:0,padding:"11px 14px",border:"none",cursor:"pointer",background:"transparent",borderBottom:`3px solid ${isActive?cat.color:"transparent"}`,color:isActive?cat.color:"#64748b",transition:"all 0.15s",position:"relative"}}>
                <div style={{fontSize:13,fontWeight:700,whiteSpace:"nowrap"}}>{cat.icon} {cat.label}</div>
                {catSelected>0&&(<div style={{position:"absolute",top:6,right:6,width:14,height:14,borderRadius:"50%",background:cat.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"white"}}>{catSelected}</div>)}
              </button>
            );
          })}
        </div>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {currentCat.items.map(item=>{
            const active = hardscapes[item.id]!=null;
            return(
              <div key={item.id} style={{background:active?`${currentCat.color}11`:"#0f172a",border:`2px solid ${active?currentCat.color:"#1e293b"}`,borderRadius:12,padding:"12px 14px",transition:"all 0.15s"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:10,background:active?`${currentCat.color}22`:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{item.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:active?currentCat.color:"#e2e8f0",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      {item.label}{active&&<span style={{fontSize:10,background:`${currentCat.color}33`,color:currentCat.color,borderRadius:20,padding:"2px 8px",fontWeight:700}}>ADDED ✓</span>}
                    </div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{item.desc}</div>
                    {active&&item.unit!=="unit"&&(
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                        <span style={{fontSize:11,color:"#64748b"}}>Quantity:</span>
                        <input type="number" value={hardscapes[item.id]||0} min={0} onChange={e=>setHSQty(item.id,e.target.value)} style={{width:80,background:"#1e293b",border:`1px solid ${currentCat.color}66`,borderRadius:8,padding:"5px 10px",color:currentCat.color,fontSize:14,fontWeight:700,outline:"none"}} />
                        <span style={{fontSize:11,color:"#64748b"}}>{item.unit}</span>
                      </div>
                    )}
                  </div>
                  <button onClick={()=>toggleHardscape(item.id)} style={{padding:"9px 16px",borderRadius:10,border:`2px solid ${active?currentCat.color:"#334155"}`,background:active?`${currentCat.color}22`:"#1e293b",color:active?currentCat.color:"#94a3b8",fontWeight:800,fontSize:13,cursor:"pointer",flexShrink:0,transition:"all 0.15s",whiteSpace:"nowrap"}}>
                    {active?"✓ Added":"+ Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totalSelected>0&&(
        <div style={{background:"rgba(6,182,212,0.07)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:12,padding:12}}>
          <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Your Outdoor Space Design ({totalSelected} elements)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null).map(h=>(
              <span key={h.id} style={{padding:"4px 10px",borderRadius:20,background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.25)",color:"#06b6d4",fontSize:12,fontWeight:600}}>
                {h.icon} {h.label}{h.unit!=="unit"?` - ${hardscapes[h.id]} ${h.unit}`:""}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>Daily Renders Remaining</div>
            <div style={{fontSize:12,fontWeight:800,color:limitHit?"#ef4444":rendersLeft<=3?"#f59e0b":"#22c55e"}}>{limitHit?"Limit reached":`${rendersLeft} left today`}</div>
          </div>
          <div style={{height:5,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min((dailyRenders/dailyLimit)*100,100)}%`,background:limitHit?"#ef4444":rendersLeft<=3?"linear-gradient(90deg,#f59e0b,#ef4444)":"linear-gradient(90deg,#22c55e,#34d399)",borderRadius:3,transition:"width 0.4s"}} /></div>
          <div style={{fontSize:10,color:"#334155",marginTop:4}}>{dailyRenders} of {dailyLimit} used - Pool + Hardscape renders share this limit - Resets midnight</div>
        </div>

        <div>
          <div style={{fontSize:11,color:"#34d399",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>🎨 Rendering Style</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[{id:"photorealistic",label:"📷 Photorealistic"},{id:"twilight",label:"🌅 Twilight"},{id:"night",label:"🌙 Night"},{id:"magazine",label:"✨ Magazine"}].map(s=>(
              <button key={s.id} onClick={()=>setStyle(s.id)} style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${style===s.id?"#34d399":"#1e293b"}`,background:style===s.id?"rgba(52,211,153,0.1)":"transparent",color:style===s.id?"#34d399":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{fontSize:11,color:"#34d399",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>✍️ Additional Instructions</div>
          <textarea value={tweak} onChange={e=>setTweak(e.target.value)} placeholder="e.g. 'use travertine throughout, add string lights, mature palms in corners'" rows={2}
            style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",resize:"none",boxSizing:"border-box",lineHeight:1.5,fontFamily:"inherit"}} />
        </div>

        {limitHit ? (
          <div style={{padding:"14px",borderRadius:12,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:"#ef4444",marginBottom:4}}>⏰ Daily Limit Reached</div>
            <div style={{fontSize:12,color:"#94a3b8"}}>All {dailyLimit} renders used today. Resets at midnight.</div>
          </div>
        ) : !apiKey ? (
          <div style={{padding:"14px",borderRadius:12,background:"rgba(52,211,153,0.06)",border:"1px solid rgba(52,211,153,0.2)",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#34d399",marginBottom:4}}>🔑 Grok API Key Required</div>
            <div style={{fontSize:12,color:"#6ee7b7"}}>Add your xAI API key on the Design tab to activate rendering.</div>
          </div>
        ) : (
          <button onClick={rendering?null:handleRender} style={{width:"100%",padding:"16px",borderRadius:12,background:rendering?"#1e293b":"linear-gradient(135deg,#059669,#047857)",border:"none",color:"white",fontWeight:800,fontSize:15,cursor:rendering?"not-allowed":"pointer",boxShadow:rendering?"none":"0 4px 20px rgba(5,150,105,0.3)",transition:"all 0.2s"}}>
            {rendering?`⏳ ${progressMsg}`:rendered?"🔄 Generate New Variation":"🚀 Generate Hardscape Rendering"}
          </button>
        )}

        {rendering&&(
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:12,color:"#34d399",fontWeight:600}}>{progressMsg}</span><span style={{fontSize:12,color:"#64748b"}}>{progress}%</span></div>
            <div style={{height:5,background:"#1e293b",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#059669,#34d399,#06b6d4)",borderRadius:3,transition:"width 2.5s ease"}} /></div>
          </div>
        )}

        {error&&!rendering&&(
          <div style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:10,padding:12}}>
            <div style={{fontSize:13,color:"#ef4444",fontWeight:600,marginBottom:8}}>⚠️ {error}</div>
            <button onClick={()=>setError(null)} style={{padding:"6px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer"}}>Dismiss</button>
          </div>
        )}

        {rendered&&!rendering&&(
          <div style={{background:"#0f172a",border:"2px solid rgba(52,211,153,0.35)",borderRadius:14,overflow:"hidden",boxShadow:"0 6px 30px rgba(52,211,153,0.12)"}}>
            <div style={{position:"relative"}}>
              <img src={rendered} alt="Hardscape rendering" style={{width:"100%",display:"block"}} />
              <div style={{position:"absolute",top:10,left:10,background:"rgba(5,150,105,0.92)",borderRadius:8,padding:"5px 12px",fontSize:11,color:"white",fontWeight:700}}>🏡 Grok Aurora - Outdoor Design #{renderCount}</div>
              <div style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.6)",borderRadius:8,padding:"4px 10px",fontSize:10,color:"#94a3b8"}}>Pool Craft Pro</div>
            </div>
            {aiDesc&&(<div style={{padding:"12px 14px",background:"rgba(52,211,153,0.06)",borderTop:"1px solid rgba(52,211,153,0.15)"}}><div style={{fontSize:10,color:"#34d399",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>🤖 AI Designer Notes</div><div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6,fontStyle:"italic"}}>{aiDesc}</div></div>)}
            <div style={{padding:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setRendered(null);setAiDesc(null);setError(null);}} style={{padding:"11px",borderRadius:10,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.3)",color:"#34d399",fontWeight:700,fontSize:13,cursor:"pointer"}}>🔄 New Variation</button>
              <a href={rendered} download={`poolcraft-hardscape-${renderCount}.jpg`} style={{padding:"11px",borderRadius:10,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",fontWeight:700,fontSize:13,textDecoration:"none",textAlign:"center",display:"block"}}>⬇️ Save Design</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── YARD PLANNER ─────────────────────────────────────────────────────────────
const YARD_ELEMENTS = [
  { id:"pool", cat:"Pool", label:"Swimming Pool", icon:"🏊", color:"#0ea5e9", w:80, h:50, shape:"rect" },
  { id:"spa", cat:"Pool", label:"Spa / Hot Tub", icon:"🛁", color:"#8b5cf6", w:32, h:32, shape:"circle" },
  { id:"pergola", cat:"Structures", label:"Pergola", icon:"🏠", color:"#d97706", w:60, h:50, shape:"rect" },
  { id:"outdoor_kit", cat:"Structures", label:"Outdoor Kitchen", icon:"🍳", color:"#0ea5e9", w:50, h:36, shape:"rect" },
  { id:"gazebo", cat:"Structures", label:"Gazebo", icon:"⛺", color:"#7c3aed", w:44, h:44, shape:"circle" },
  { id:"fire_pit", cat:"Fire & Water", label:"Fire Pit", icon:"🔥", color:"#ef4444", w:28, h:28, shape:"circle" },
  { id:"waterfall", cat:"Fire & Water", label:"Waterfall", icon:"💧", color:"#06b6d4", w:24, h:36, shape:"rect" },
  { id:"fountain", cat:"Fire & Water", label:"Fountain", icon:"⛲", color:"#22d3ee", w:24, h:24, shape:"circle" },
  { id:"tree_lg", cat:"Landscaping", label:"Large Tree", icon:"🌳", color:"#16a34a", w:36, h:36, shape:"circle" },
  { id:"tree_sm", cat:"Landscaping", label:"Small Tree", icon:"🌲", color:"#22c55e", w:24, h:24, shape:"circle" },
  { id:"palm", cat:"Landscaping", label:"Palm Tree", icon:"🌴", color:"#4ade80", w:22, h:22, shape:"circle" },
  { id:"shrub", cat:"Landscaping", label:"Shrub / Hedge", icon:"🌿", color:"#86efac", w:20, h:20, shape:"circle" },
  { id:"planting_bed", cat:"Landscaping", label:"Planting Bed", icon:"🪴", color:"#a3e635", w:50, h:28, shape:"rect" },
  { id:"patio", cat:"Hardscape", label:"Patio / Deck", icon:"🪵", color:"#d97706", w:80, h:60, shape:"rect" },
  { id:"pathway", cat:"Hardscape", label:"Pathway", icon:"🛤️", color:"#a8a29e", w:16, h:60, shape:"rect" },
  { id:"ret_wall", cat:"Hardscape", label:"Retaining Wall", icon:"🧱", color:"#78716c", w:80, h:14, shape:"rect" },
  { id:"sport_court", cat:"Hardscape", label:"Sport Court", icon:"🏀", color:"#f59e0b", w:70, h:50, shape:"rect" },
  { id:"table_set", cat:"Furniture", label:"Dining Set", icon:"🍽️", color:"#94a3b8", w:36, h:36, shape:"rect" },
  { id:"loungers", cat:"Furniture", label:"Lounge Chairs", icon:"🪑", color:"#f59e0b", w:40, h:20, shape:"rect" },
  { id:"umbrella", cat:"Furniture", label:"Patio Umbrella", icon:"⛱️", color:"#ec4899", w:24, h:24, shape:"circle" },
  { id:"fence_pool", cat:"Safety", label:"Pool Safety Fence", icon:"🚧", color:"#f59e0b", w:100, h:8, shape:"rect" },
  { id:"lighting", cat:"Safety", label:"Outdoor Lighting", icon:"💡", color:"#fbbf24", w:10, h:10, shape:"circle" },
];
const YARD_CATS = [...new Set(YARD_ELEMENTS.map(e=>e.cat))];

function YardOverlayCanvas({ placed, setPlaced, selected, setSelected, showDims }) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const draggingRef = useRef(null); // sync ref so onMove doesn't use stale closure
  const rafPending = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    placed.forEach(el => {
      const isSel = el.id === selected;
      ctx.save(); ctx.globalAlpha = 0.82; ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = isSel ? 18 : 8; ctx.shadowOffsetY = 3;
      if (el.shape === "circle") {
        const r = el.w / 2;
        ctx.fillStyle = el.color + "cc"; ctx.beginPath(); ctx.arc(el.x + r, el.y + r, r, 0, Math.PI * 2); ctx.fill();
        if (isSel) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.stroke(); }
      } else {
        ctx.fillStyle = el.color + "cc"; ctx.beginPath(); ctx.roundRect(el.x, el.y, el.w, el.h, 5); ctx.fill();
        if (isSel) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(el.x, el.y, el.w, el.h, 5); ctx.stroke(); }
      }
      ctx.restore();
      const fontSize = Math.min(el.w, el.h) * 0.48;
      ctx.font = `${fontSize}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(el.icon, el.x + el.w / 2, el.y + el.h / 2);
      if (showDims || isSel) {
        ctx.font = "bold 9px Inter,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        const lbl = `${el.label.slice(0,12)}`; const tw = ctx.measureText(lbl).width + 6;
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.beginPath(); ctx.roundRect(el.x + el.w/2 - tw/2, el.y + el.h + 2, tw, 11, 3); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.fillText(lbl, el.x + el.w/2, el.y + el.h + 3);
      }
      if (isSel) { ctx.fillStyle = "#fff"; [[el.x, el.y],[el.x+el.w, el.y],[el.x, el.y+el.h],[el.x+el.w, el.y+el.h]].forEach(([hx,hy]) => { ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI*2); ctx.fill(); }); }
    });
  }, [placed, selected, showDims]);
  useEffect(() => {
    if(rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(()=>{ rafPending.current = false; draw(); });
  }, [draw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = canvasRef.current.width / rect.width, sy = canvasRef.current.height / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  };
  const onDown = (e) => {
    const pos = getPos(e);
    for (let i = placed.length - 1; i >= 0; i--) {
      const el = placed[i];
      if (pos.x >= el.x && pos.x <= el.x+el.w && pos.y >= el.y && pos.y <= el.y+el.h) {
        setSelected(el.id); setDragging({ pid: el.id, offX: pos.x - el.x, offY: pos.y - el.y });
        draggingRef.current = { pid: el.id, offX: pos.x - el.x, offY: pos.y - el.y };
        e.preventDefault(); return;
      }
    }
    setSelected(null); draggingRef.current = null; e.preventDefault();
  };
  const onMove = (e) => {
    if (!draggingRef.current) return;
    const pos = getPos(e); const canvas = canvasRef.current;
    const d = draggingRef.current;
    setPlaced(prev => prev.map(el => el.id === d.pid ? { ...el, x: Math.max(0, Math.min(canvas.width - el.w, pos.x - d.offX)), y: Math.max(0, Math.min(canvas.height - el.h, pos.y - d.offY)) } : el));
    e.preventDefault();
  };
  const onUp = () => { setDragging(null); draggingRef.current = null; };

  return (
    <canvas ref={canvasRef} width={600} height={480} style={{ position:"absolute", inset:0, width:"100%", height:"100%", cursor: dragging ? "grabbing" : selected ? "grab" : "crosshair", touchAction:"none" }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} />
  );
}

function YardPlanner({ poolLen, poolWid, poolShape, poolColor, parcelData }) {
  const [address, setAddress] = useState(parcelData?.address || "");
  const [mapSrc, setMapSrc] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [placed, setPlaced] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeCat, setActiveCat] = useState("Pool");
  const [showDims, setShowDims] = useState(true);
  const [nextId, setNextId] = useState(1);
  const [zoom, setZoom] = useState(20);
  const mapContainerRef = useRef(null);

  useEffect(() => { if (parcelData?.address && !mapSrc) { setAddress(parcelData.address); loadMap(parcelData.address); } }, [parcelData]);

  const buildMapUrl = (addr, z) => {
    const q = encodeURIComponent(addr);
    const gKey = import.meta.env.VITE_GMAPS_KEY ? import.meta.env.VITE_GMAPS_KEY : (() => { try { return localStorage.getItem("pc_gmaps_key")||""; } catch { return ""; } })();
    if (gKey) return `https://www.google.com/maps/embed/v1/place?key=${gKey}&q=${q}&zoom=${z}&maptype=satellite`;
    return `https://maps.google.com/maps?q=${q}&t=k&z=${z}&output=embed&hl=en`;
  };
  const loadMap = (addr) => { if (!addr.trim()) return; setMapLoading(true); setMapSrc(buildMapUrl(addr, zoom)); };
  const handleSearch = () => loadMap(address);
  const handleZoom = (delta) => { const nz = Math.max(16, Math.min(21, zoom + delta)); setZoom(nz); if (mapSrc) setMapSrc(buildMapUrl(address, nz)); };
  const addElement = (el) => { const newEl = { ...el, id: nextId, x: 200, y: 180 }; setPlaced(p => [...p, newEl]); setNextId(n => n + 1); setSelected(newEl.id); };
  const selectedEl = placed.find(e => e.id === selected);
  const resizeSelected = (axis, delta) => setPlaced(p => p.map(el => el.id === selected ? { ...el, w: axis === "w" ? Math.max(12, el.w + delta) : el.w, h: axis === "h" ? Math.max(12, el.h + delta) : el.h } : el));
  const removeSelected = () => { setPlaced(p => p.filter(e => e.id !== selected)); setSelected(null); };
  const clearAll = () => { setPlaced([]); setSelected(null); };

  const printMap = () => {
    const win = window.open("", "_blank"); if (!win) return;
    const elList = placed.map(e => `${e.icon} ${e.label}`).join(", ");
    win.document.write(`<!DOCTYPE html><html><head><title>Pool Craft Pro - Yard Plan</title>
    <style>body{margin:0;padding:20px;font-family:Inter,sans-serif;background:#fff}h2{font-size:16px;margin:0 0 4px}p{color:#64748b;font-size:12px;margin:0 0 14px}
    .map-wrap{position:relative;width:100%;padding-bottom:80%;border:2px solid #e2e8f0;border-radius:8px;overflow:hidden}.map-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
    .elements{margin-top:14px;font-size:12px;color:#374151}.footer{margin-top:14px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px}</style></head><body>
    <h2>Pool Craft Pro - Yard Layout Plan</h2><p>${address || "Property Site Plan"} - Generated ${new Date().toLocaleDateString()}</p>
    <div class="map-wrap"><iframe src="${mapSrc}" allowfullscreen></iframe></div>
    ${elList ? `<div class="elements"><strong>Design elements placed:</strong> ${elList}</div>` : ""}
    <div class="footer">Satellite imagery is for planning reference only. Verify all setbacks and measurements with your local building department before construction. Generated by Pool Craft Pro · Design Pools. Craft Outdoor Living..</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),1500);</script></body></html>`);
    win.document.close();
  };

  const catItems = YARD_ELEMENTS.filter(e => e.cat === activeCat);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,#1e3a5f,#1a3a2a)",border:"1px solid #1e293b",borderRadius:16,padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:"#e2e8f0",marginBottom:4}}>🗺️ Yard & Landscape Planner</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Enter any address to load the real satellite view of that property from Google Maps. Then drag and drop design elements directly onto the aerial photo to plan the full outdoor space.</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>📍 Property Address - Loads Real Satellite View</div>
        <div style={{display:"flex",gap:8}}>
          <input type="text" placeholder="123 Main St, City, State" value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,outline:"none"}} />
          <button onClick={handleSearch} style={{padding:"11px 20px",borderRadius:10,background:"linear-gradient(135deg,#06b6d4,#0284c7)",border:"none",color:"white",fontWeight:800,fontSize:14,cursor:"pointer",flexShrink:0}}>Search</button>
        </div>
        {parcelData && <div style={{marginTop:8,fontSize:11,color:"#06b6d4"}}>✅ Loaded from Design tab: {parcelData.address} - APN {parcelData.parcel}</div>}
        {!mapSrc && <div style={{marginTop:8,fontSize:11,color:"#64748b"}}>💡 Tip: Search the address on the Design tab first to also load parcel data and setback info</div>}
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
        {!mapSrc ? (
          <div style={{height:340,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,background:"#0f172a"}}>
            <div style={{fontSize:48}}>🛰️</div>
            <div style={{fontSize:14,fontWeight:700,color:"#94a3b8"}}>Enter an address above to load satellite view</div>
            <div style={{fontSize:12,color:"#64748b"}}>Real Google Maps satellite imagery will appear here</div>
          </div>
        ) : (
          <div>
            <div style={{padding:"10px 14px",background:"#0f172a",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#22c55e",display:"flex",alignItems:"center",gap:6}}>🛰️ Google Maps Satellite - {address}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:11,color:"#64748b"}}>Zoom:</span>
                <button onClick={()=>handleZoom(-1)} style={{width:36,height:36,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{fontSize:12,fontWeight:700,color:"#06b6d4",minWidth:20,textAlign:"center"}}>{zoom}</span>
                <button onClick={()=>handleZoom(1)} style={{width:36,height:36,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:18,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                <button onClick={()=>{ setMapSrc(null); setPlaced([]); setSelected(null); }} style={{padding:"8px 14px",minHeight:36,borderRadius:8,border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer"}}>✕ Clear</button>
              </div>
            </div>
            <div ref={mapContainerRef} style={{position:"relative",width:"100%",paddingBottom:"80%",background:"#0a0a0a"}}>
              <iframe src={mapSrc} style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}} onLoad={()=>setMapLoading(false)} allowFullScreen title="Satellite Map" />
              <YardOverlayCanvas placed={placed} setPlaced={setPlaced} selected={selected} setSelected={setSelected} showDims={showDims} />
              {mapLoading && (<div style={{position:"absolute",inset:0,background:"rgba(11,17,32,0.7)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}><div style={{fontSize:32}}>🛰️</div><div style={{fontSize:13,color:"#06b6d4",fontWeight:600}}>Loading satellite imagery...</div></div>)}
            </div>
            <div style={{padding:"8px 14px",background:"#0f172a",fontSize:11,color:"#64748b",display:"flex",alignItems:"center",gap:6}}><span>📌</span> Drag elements from the palette below onto the map - Tap to select - Drag to reposition</div>
          </div>
        )}
      </div>

      {mapSrc && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[{label:`📏 Labels ${showDims?"On":"Off"}`, action:()=>setShowDims(p=>!p), active:showDims, color:"#22c55e"},{label:"🖨️ Print / Export", action:printMap, active:false, color:"#a78bfa"},{label:"🗑 Clear Elements", action:clearAll, active:false, color:"#ef4444"}].map(btn=>(
            <button key={btn.label} onClick={btn.action} style={{padding:"7px 12px",borderRadius:8,border:`2px solid ${btn.active?btn.color+"88":"#334155"}`,background:btn.active?`${btn.color}18`:"#111827",color:btn.active?btn.color:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>{btn.label}</button>
          ))}
        </div>
      )}

      {selectedEl && (
        <div style={{background:"#111827",border:`2px solid ${selectedEl.color}55`,borderRadius:12,padding:12}}>
          <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>{selectedEl.icon} {selectedEl.label} - Selected</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:"#64748b"}}>Width:</span>
              <button onClick={()=>resizeSelected("w",-8)} style={{width:36,height:36,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:16,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <span style={{fontSize:12,fontWeight:700,color:selectedEl.color,minWidth:30,textAlign:"center"}}>{selectedEl.w}px</span>
              <button onClick={()=>resizeSelected("w",8)} style={{width:36,height:36,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:16,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:"#64748b"}}>Height:</span>
              <button onClick={()=>resizeSelected("h",-8)} style={{width:36,height:36,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:16,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <span style={{fontSize:12,fontWeight:700,color:selectedEl.color,minWidth:30,textAlign:"center"}}>{selectedEl.h}px</span>
              <button onClick={()=>resizeSelected("h",8)} style={{width:36,height:36,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#e2e8f0",fontSize:16,fontWeight:700,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            <button onClick={removeSelected} style={{padding:"8px 16px",minHeight:36,borderRadius:8,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer",marginLeft:"auto"}}>🗑 Remove</button>
          </div>
        </div>
      )}

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,overflow:"hidden"}}>
        <div style={{display:"flex",overflowX:"auto",borderBottom:"1px solid #1e293b",background:"#0f172a"}}>
          {YARD_CATS.map(cat => {
            const catColor = YARD_ELEMENTS.find(e=>e.cat===cat)?.color || "#06b6d4";
            const isActive = activeCat === cat;
            return (<button key={cat} onClick={()=>setActiveCat(cat)} style={{flexShrink:0,padding:"10px 14px",border:"none",cursor:"pointer",background:"transparent",borderBottom:`3px solid ${isActive?catColor:"transparent"}`,color:isActive?catColor:"#64748b",fontSize:12,fontWeight:700,whiteSpace:"nowrap",transition:"all 0.15s"}}>{cat}</button>);
          })}
        </div>
        <div style={{padding:12}}>
          <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>{mapSrc ? "Tap to add to the satellite map - Drag to position" : "Load a satellite map above first - Then tap to add elements"}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
            {catItems.map(el => (
              <button key={el.id} onClick={()=>addElement(el)} style={{padding:"10px 12px",borderRadius:10,border:`1.5px solid ${el.color}44`,background:`${el.color}11`,cursor:"pointer",textAlign:"left",transition:"all 0.15s",display:"flex",alignItems:"center",gap:10,opacity:mapSrc?1:0.5}}>
                <span style={{fontSize:22,flexShrink:0}}>{el.icon}</span><div><div style={{fontSize:12,fontWeight:700,color:el.color,lineHeight:1.2}}>{el.label}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {placed.length > 0 && (
        <div style={{background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:12,padding:12}}>
          <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>On Your Map ({placed.length} elements)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {placed.map(el => (<button key={el.id} onClick={()=>setSelected(el.id)} style={{padding:"4px 10px",borderRadius:20,border:`1px solid ${selected===el.id?el.color+"99":"rgba(6,182,212,0.2)"}`,background:selected===el.id?`${el.color}22`:"rgba(6,182,212,0.08)",color:selected===el.id?el.color:"#64748b",fontSize:11,fontWeight:600,cursor:"pointer"}}>{el.icon} {el.label}</button>))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SPLASH SCREEN ─────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  useEffect(() => { setTimeout(onDone, 2400); }, []);
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"linear-gradient(135deg,#0a0f1e 0%,#0f1e3d 50%,#080d18 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:0}}>
      <div style={{position:"relative",width:120,height:120,marginBottom:20}}>
        {[1,2,3].map(i=>(<div key={i} style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(201,168,76,0.3)",animation:`ripple ${i*0.6+0.6}s ease-out infinite`,animationDelay:`${i*0.2}s`}} />))}
        {/* FCP monogram with water drop */}
        <div style={{position:"absolute",inset:8,borderRadius:"50%",background:"linear-gradient(135deg,#1a2f5e,#0f1e3d)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 40px rgba(201,168,76,0.35)"}}>
          <svg viewBox="0 0 80 60" width="70" height="52">
            <defs>
              <linearGradient id="sNavy" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4a7ab5"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
              <linearGradient id="sGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
              <linearGradient id="sDrop" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
            </defs>
            <text x="2" y="46" fontFamily="Georgia,serif" fontWeight="700" fontSize="46" fill="url(#sNavy)">F</text>
            <path d="M 40 2 C 40 2, 29 20, 29 28 C 29 36 34 42 40 42 C 46 42 51 36 51 28 C 51 20 40 2 40 2 Z" fill="url(#sDrop)"/>
            <ellipse cx="36" cy="22" rx="3" ry="5" fill="white" opacity="0.35" transform="rotate(-15 36 22)"/>
            <text x="44" y="46" fontFamily="Georgia,serif" fontWeight="700" fontSize="46" fill="url(#sGold)">P</text>
          </svg>
        </div>
      </div>
      {/* Wordmark */}
      <div style={{textAlign:"center",marginBottom:8}}>
        <div style={{fontSize:32,fontWeight:900,letterSpacing:"3px",fontFamily:"Georgia,serif"}}>
          <span style={{color:"#e2e8f0"}}>POOL </span>
          <span style={{color:"#c9a84c"}}>CRAFT </span>
          <span style={{color:"#e2e8f0"}}>PRO</span>
        </div>
        <div style={{fontSize:11,color:"#8a9ab5",letterSpacing:"2.5px",textTransform:"uppercase",marginTop:6,fontFamily:"sans-serif"}}>Design Pools. Craft Outdoor Living.</div>
      </div>
      <div style={{marginTop:32,display:"flex",gap:6}}>{[0,1,2].map(i=>(<div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#c9a84c",opacity:0.4,animation:"pulse 1s ease-in-out infinite",animationDelay:`${i*0.2}s`}} />))}</div>
      <style>{`@keyframes ripple{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(2.2);opacity:0}}@keyframes pulse{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
    </div>
  );
}

// ─── COST ESTIMATOR ────────────────────────────────────────────────────────────
const COST_RANGES = {
  plaster: { low:5, high:8, unit:"sq ft", label:"Plaster Finish" },
  pebble: { low:8, high:14, unit:"sq ft", label:"Pebble Tec Finish" },
  quartz: { low:7, high:12, unit:"sq ft", label:"Quartz Finish" },
  tile: { low:20, high:45, unit:"sq ft", label:"Full Tile Finish" },
  fiberglass: { low:4, high:7, unit:"sq ft", label:"Fiberglass Finish" },
  glass_bead: { low:10, high:18, unit:"sq ft", label:"Glass Bead Finish" },
  excavation: { low:50, high:90, unit:"cu yd", label:"Excavation" },
  gunite: { low:180, high:280, unit:"cu yd", label:"Gunite / Shotcrete" },
  beach_entry: { low:3000, high:6000, unit:"unit", label:"Beach Entry" },
  baja_shelf: { low:1500, high:3500, unit:"unit", label:"Baja Shelf" },
  steps_corner: { low:800, high:1800, unit:"unit", label:"Corner Steps" },
  steps_end: { low:1200, high:2500, unit:"unit", label:"End Steps" },
  steps_curved: { low:2000, high:4500, unit:"unit", label:"Curved Steps" },
  swim_up_bar: { low:8000, high:18000, unit:"unit", label:"Swim-Up Bar" },
  grotto: { low:15000, high:40000, unit:"unit", label:"Grotto / Cave" },
  infinity_edge: { low:10000, high:25000, unit:"unit", label:"Infinity Edge" },
  spa_attached: { low:8000, high:20000, unit:"unit", label:"Attached Spa" },
  splash_pad: { low:5000, high:12000, unit:"unit", label:"Splash Pad" },
  diving_rock: { low:6000, high:18000, unit:"unit", label:"Diving Rock" },
  sun_shelf_umbrella: { low:800, high:2000, unit:"unit", label:"Sun Shelf w/ Sleeve" },
  concrete_deck: { low:8, high:18, unit:"sq ft", label:"Concrete Deck" },
  travertine: { low:18, high:35, unit:"sq ft", label:"Travertine Pavers" },
  cool_deck: { low:3, high:7, unit:"sq ft", label:"Kool Deck" },
  wood_composite: { low:20, high:40, unit:"sq ft", label:"Composite Decking" },
  fire_pit: { low:2500, high:8000, unit:"unit", label:"Fire Pit" },
  fire_bowls: { low:500, high:2000, unit:"unit", label:"Fire Bowls" },
  pergola: { low:5000, high:20000, unit:"unit", label:"Pergola" },
  retaining_wall: { low:30, high:80, unit:"linear ft", label:"Retaining Wall" },
  outdoor_kitchen: { low:8000, high:35000, unit:"unit", label:"Outdoor Kitchen" },
  landscape_beds: { low:5, high:15, unit:"sq ft", label:"Planting Beds" },
  fence: { low:25, high:60, unit:"linear ft", label:"Pool Fence" },
  putting_green: { low:15, high:40, unit:"sq ft", label:"Putting Green" },
  sport_court: { low:6, high:20, unit:"sq ft", label:"Sport Court" },
  bocce: { low:2000, high:6000, unit:"unit", label:"Bocce Court" },
};
function fmt(n) { if (!Number.isFinite(n)) return "—"; if (n >= 1000) return `$${(n/1000).toFixed(n%1000===0?0:1)}k`; return `$${n.toLocaleString()}`; }

function computeCostItems({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates }) {
  len = Number.isFinite(len) && len > 0 ? len : 1;
  wid = Number.isFinite(wid) && wid > 0 ? wid : 1;
  const sf = {rectangle:1,oval:0.79,lshape:0.75,freeform:0.85,lap:1,greek:1,figure8:0.78}[shape]||1;
  const avgDepth = {shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25;
  const footprint = len*wid*sf;
  const shell = footprint + 2*(len+wid)*avgDepth*sf;
  const excavCY = Math.round(footprint*avgDepth*1.2/27);
  const guniteCY = Math.round(shell*(4/12)/27);
  const finishSF = Math.round(shell);
  const mult = localRates?.multiplier || 1;
  const laborMult = localRates?.laborMultiplier || 1;

  const items = [];
  const excR = COST_RANGES.excavation;
  items.push({ cat:"Pool Structure", label:"Excavation", qty:excavCY, unit:"cu yd", low:excR.low*excavCY*mult, high:excR.high*excavCY*mult });
  const gunR = COST_RANGES.gunite;
  items.push({ cat:"Pool Structure", label:"Gunite / Shotcrete", qty:guniteCY, unit:"cu yd", low:gunR.low*guniteCY*mult, high:gunR.high*guniteCY*mult });
  const finR = COST_RANGES[finishId] || COST_RANGES.plaster;
  items.push({ cat:"Pool Structure", label:finR.label, qty:finishSF, unit:"sq ft", low:finR.low*finishSF*mult, high:finR.high*finishSF*mult });
  items.push({ cat:"Pool Structure", label:"Plumbing, Steel & Misc", qty:1, unit:"allowance", low:4000*mult, high:9000*mult });

  Object.keys(entries).forEach(id => { const r = COST_RANGES[id]; if (r) items.push({ cat:"Entry & Features", label:r.label, qty:1, unit:"unit", low:r.low*mult, high:r.high*mult }); });
  Object.entries(hardscapes).forEach(([id,qty]) => {
    if (qty==null) return; const r = COST_RANGES[id]; if (!r) return;
    const q = r.unit==="unit" ? 1 : Number(qty)||1;
    items.push({ cat:"Hardscapes", label:r.label, qty:q, unit:r.unit, low:r.low*q*mult, high:r.high*q*mult });
  });

  items.push({ cat:"Equipment", label:"Variable Speed Pump", qty:1, unit:"unit", low:800*mult, high:1800*mult });
  items.push({ cat:"Equipment", label:"Pool Filter", qty:1, unit:"unit", low:600*mult, high:1400*mult });
  items.push({ cat:"Equipment", label:"Automation System", qty:1, unit:"unit", low:1500*mult, high:3500*mult });
  items.push({ cat:"Equipment", label:"LED Pool Lighting", qty:1, unit:"unit", low:400*mult, high:900*mult });
  if (extras?.sanitization==="salt") items.push({ cat:"Equipment", label:"Salt Chlorine System", qty:1, unit:"unit", low:700*mult, high:1800*mult });
  if (extras?.heater) items.push({ cat:"Equipment", label:"Pool Heater", qty:1, unit:"unit", low:2000*mult, high:4500*mult });

  const matLow = items.reduce((s,i)=>s+i.low,0);
  const matHigh = items.reduce((s,i)=>s+i.high,0);
  items.push({ cat:"Labor", label:"Installation Labor (est.)", qty:1, unit:"allowance", low:Math.round(matLow*0.38*laborMult), high:Math.round(matHigh*0.52*laborMult) });
  items.push({ cat:"Labor", label:"Permits, Engineering & Inspections", qty:1, unit:"allowance", low:2000*mult, high:6000*mult });

  const totalLow = items.reduce((s,i)=>s+i.low,0);
  const totalHigh = items.reduce((s,i)=>s+i.high,0);
  return { items, totalLow, totalHigh };
}

function CostEstimator({ shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, localRates, setLocalRates, projectName, clientName, materials }) {
  const [expanded, setExpanded] = useState({});
  const [showLocalRates, setShowLocalRates] = useState(false);
  const toggleExp = (k) => setExpanded(p=>({...p,[k]:!p[k]}));

  const { items, totalLow, totalHigh } = computeCostItems({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates });
  const sf = {rectangle:1,oval:0.79,lshape:0.75,freeform:0.85,lap:1,greek:1,figure8:0.78}[shape]||1;
  const mult = localRates?.multiplier || 1;
  const laborMult = localRates?.laborMultiplier || 1;

  const cats = [...new Set(items.map(i=>i.cat))];
  const catColors = { "Pool Structure":"#06b6d4", "Entry & Features":"#f59e0b", "Hardscapes":"#22c55e", "Equipment":"#8b5cf6", "Labor":"#94a3b8" };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:4}}>📊 {mult!==1||laborMult!==1?"Cost Ranges Adjusted to Your Local Rates":"Typical Cost Ranges - For Budgeting Reference Only"}</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>{mult!==1||laborMult!==1?"You've customized these from national averages. Adjust further below.":"These are typical national cost ranges. Adjust to your local market below, or get 3 contractor quotes for exact pricing."}</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
        <button onClick={()=>setShowLocalRates(p=>!p)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",textAlign:"left"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#06b6d4"}}>⚙️ Adjust to Your Local Market</span>
          <span style={{color:"#64748b",fontSize:14}}>{showLocalRates?"▲":"▼"}</span>
        </button>
        {showLocalRates&&(
          <div style={{padding:"0 16px 16px",display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>National averages are a starting point. If your local material costs or labor rates run higher or lower, adjust the multipliers below — every number in this estimate updates instantly.</div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>Material & Equipment Costs</span>
                <span style={{fontSize:12,fontWeight:800,color:"#06b6d4"}}>{Math.round(mult*100)}% of national avg</span>
              </div>
              <input type="range" min="0.6" max="1.6" step="0.05" value={mult} onChange={e=>setLocalRates(p=>({...(p||{}),multiplier:Number(e.target.value)}))} style={{width:"100%",accentColor:"#c9a84c"}} />
            </div>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>Local Labor Rates</span>
                <span style={{fontSize:12,fontWeight:800,color:"#f59e0b"}}>{Math.round(laborMult*100)}% of national avg</span>
              </div>
              <input type="range" min="0.6" max="1.8" step="0.05" value={laborMult} onChange={e=>setLocalRates(p=>({...(p||{}),laborMultiplier:Number(e.target.value)}))} style={{width:"100%",accentColor:"#f59e0b"}} />
            </div>
            {(mult!==1||laborMult!==1)&&<button onClick={()=>setLocalRates({multiplier:1,laborMultiplier:1})} style={{padding:"7px 14px",borderRadius:8,background:"rgba(100,116,139,0.1)",border:"1px solid #334155",color:"#94a3b8",fontSize:11,fontWeight:700,cursor:"pointer",alignSelf:"flex-start"}}>Reset to National Average</button>}
          </div>
        )}
      </div>

      <div style={{background:"linear-gradient(135deg,#0f2027,#1a3a4a)",border:"1px solid rgba(6,182,212,0.3)",borderRadius:16,padding:20,textAlign:"center"}}>
        <div style={{fontSize:12,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Estimated Total Project Range</div>
        <div style={{fontSize:36,fontWeight:900,color:"#06b6d4",letterSpacing:"-1px"}}>{fmt(totalLow)} – {fmt(totalHigh)}</div>
        <div style={{fontSize:12,color:"#64748b",marginTop:6}}>{len}'x{wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} - {POOL_FINISHES.find(f=>f.id===finishId)?.label} finish - {Object.keys(entries).length} features</div>
      </div>

      <button onClick={()=>generateProposal({ projectName, clientName, shape, len, wid, depthId, finishId, colorId, entries, hardscapes, materials, items, totalLow, totalHigh })}
        style={{width:"100%",padding:"15px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"white",fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:"0 4px 20px rgba(124,58,237,0.3)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        📑 Generate Client Proposal {clientName?`for ${clientName}`:""}
      </button>
      <div style={{fontSize:11,color:"#64748b",textAlign:"center",marginTop:-8}}>A polished, presentation-ready document for closing the sale — different from the internal Materials PDF.</div>

      {cats.map(cat => {
        const catItems = items.filter(i=>i.cat===cat);
        const catLow = catItems.reduce((s,i)=>s+i.low,0);
        const catHigh = catItems.reduce((s,i)=>s+i.high,0);
        const color = catColors[cat]||"#06b6d4";
        const pct = Math.round((catLow/totalLow)*100);
        return (
          <div key={cat} style={{background:"#111827",border:`1px solid #1e293b`,borderRadius:14,overflow:"hidden"}}>
            <button onClick={()=>toggleExp(cat)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color}}>{cat === "Pool Structure" ? "🏗️" : cat === "Entry & Features" ? "🏖️" : cat === "Hardscapes" ? "🧱" : cat === "Equipment" ? "⚙️" : "👷"} {cat}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:3}}>{fmt(catLow)} – {fmt(catHigh)} <span style={{color:"#334155"}}>- ~{pct}% of total</span></div>
              </div>
              <div style={{width:60,height:6,background:"#1e293b",borderRadius:3,overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3}} /></div>
              <span style={{color:"#64748b",fontSize:14}}>{expanded[cat]?"▲":"▼"}</span>
            </button>
            {expanded[cat] && (
              <div style={{borderTop:"1px solid #1e293b"}}>
                {catItems.map((item,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:"1px solid #0f172a"}}>
                  <div><div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{item.label}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{item.qty} {item.unit}</div></div>
                  <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:13,fontWeight:700,color}}>{fmt(item.low)} – {fmt(item.high)}</div></div>
                </div>))}
              </div>
            )}
          </div>
        );
      })}

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:12,padding:14,display:"flex",gap:0}}>
        {(() => {
          const footprintSf = len*wid*sf;
          const safeArea = footprintSf > 0 ? footprintSf : null;
          const gallonsBasis = Math.round(footprintSf*({shallow:3.5,standard:4.25,deep:4.75,diving:6}[depthId]||4.25)*7.48);
          const safeGallons = gallonsBasis > 0 ? gallonsBasis : null;
          return [
            { label:"Cost Per Gallon", val: safeGallons ? `${fmt(Math.round(totalLow/safeGallons))} – ${fmt(Math.round(totalHigh/safeGallons))}` : "—" },
            { label:"Cost Per Sq Ft", val: safeArea ? `${fmt(Math.round(totalLow/safeArea))} – ${fmt(Math.round(totalHigh/safeArea))}` : "—" },
            { label:"Midpoint Est.", val:fmt(Math.round((totalLow+totalHigh)/2)) },
          ];
        })().map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:"center",borderRight:i<2?"1px solid #1e293b":"none",padding:"0 8px"}}>
            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:13,fontWeight:800,color:"#06b6d4"}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11,color:"#334155",textAlign:"center",lineHeight:1.6}}>{mult!==1||laborMult!==1?"Adjusted from national base rates using your local multipliers above.":"Ranges based on typical US market rates. Get local contractor quotes for accurate pricing."}</div>
    </div>
  );
}

// ─── SHARE DESIGN ──────────────────────────────────────────────────────────────
function ShareDesign({ projectName, clientName, clientEmail, clientPhone, shape, len, wid, depthId, finishId, colorId, entries, hardscapes, materials, onClose }) {
  const [copied, setCopied] = useState(false);
  const finishLabel = POOL_FINISHES.find(f=>f.id===finishId)?.label||finishId;
  const colorLabel = POOL_COLORS.find(c=>c.id===colorId)?.label||colorId;
  const shapeLabel = POOL_SHAPES.find(s=>s.id===shape)?.label||shape;
  const depthLabel = DEPTHS.find(d=>d.id===depthId)?.label||depthId;
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
  const hasContact = !!(clientEmail || clientPhone);

  const summaryText = `${clientName?`Hi ${clientName.split(/[\s&]/)[0]},\n\nHere's a summary of your pool design from Pool Craft Pro:\n\n`:""}Pool Craft Pro Design Summary\n------------------------\nProject: ${projectName}\n\nPOOL DESIGN\n- Shape: ${shapeLabel}\n- Size: ${len}' x ${wid}'\n- Depth: ${depthLabel}\n- Water Color: ${colorLabel}\n- Finish: ${finishLabel}\n- Volume: ${materials.gallons.toLocaleString()} gallons\n\nMATERIAL QUANTITIES\n- Excavation: ${materials.excavation}\n- Gunite/Shotcrete: ${materials.gunite}\n- Rebar: ${materials.rebar}\n- PVC Plumbing: ${materials.plumbing}\n- Coping: ${materials.coping}\n- Interior Finish: ${materials.finish}\n${activeEntries.length>0?`\nPOOL FEATURES\n${activeEntries.map(e=>`- ${e.label}`).join("\n")}`:""}${activeHardscapes.length>0?`\n\nHARDSCAPES\n${activeHardscapes.map(h=>`- ${h.label}${h.unit!=="unit"?` (${hardscapes[h.id]} ${h.unit})`:""}`).join("\n")}`:""}`;

  const copyToClipboard = () => {
    try { navigator.clipboard.writeText(summaryText).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); }); }
    catch { const ta=document.createElement("textarea"); ta.value=summaryText; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopied(true); setTimeout(()=>setCopied(false),2500); }
  };
  const shareVia = (method, direct=false) => {
    const encoded = encodeURIComponent(summaryText);
    const phoneDigits = (clientPhone||"").replace(/[^0-9+]/g,"");
    const urls = {
      sms: direct&&phoneDigits ? `sms:${phoneDigits}?body=${encoded}` : `sms:?body=${encoded}`,
      email: direct&&clientEmail ? `mailto:${clientEmail}?subject=${encodeURIComponent(`Your Pool Design: ${projectName}`)}&body=${encoded}` : `mailto:?subject=${encodeURIComponent(`Pool Design: ${projectName}`)}&body=${encoded}`,
      whatsapp: `https://wa.me/${direct&&phoneDigits?phoneDigits.replace("+",""):""}?text=${encoded}`,
    };
    if (urls[method]) window.open(urls[method],"_blank");
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:500,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 20px 14px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0"}}>📤 Share Design</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:10,margin:-10,minWidth:44,minHeight:44}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {hasContact && (
            <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.25)",borderRadius:12,padding:14}}>
              <div style={{fontSize:11,color:"#22c55e",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Send directly to {clientName||"client"}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {clientEmail && <button onClick={()=>shareVia("email",true)} style={{flex:1,minWidth:140,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>📧 Email {clientEmail}</button>}
                {clientPhone && <button onClick={()=>shareVia("sms",true)} style={{flex:1,minWidth:140,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:700,fontSize:13,cursor:"pointer"}}>💬 Text {clientPhone}</button>}
              </div>
            </div>
          )}
          <div>
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{hasContact?"Or share another way":"Share Via"}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
              {[{id:"copy",icon:"📋",label:"Copy",action:copyToClipboard},{id:"sms",icon:"💬",label:"Text",action:()=>shareVia("sms")},{id:"email",icon:"📧",label:"Email",action:()=>shareVia("email")},{id:"whatsapp",icon:"💚",label:"WhatsApp",action:()=>shareVia("whatsapp")}].map(btn=>(
                <button key={btn.id} onClick={btn.action} style={{padding:"12px 8px",borderRadius:12,border:"1px solid #334155",background:copied&&btn.id==="copy"?"rgba(34,197,94,0.15)":"#0f172a",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                  <span style={{fontSize:22}}>{btn.icon}</span><span style={{fontSize:11,fontWeight:700,color:copied&&btn.id==="copy"?"#22c55e":"#94a3b8"}}>{btn.id==="copy"&&copied?"Copied!":btn.label}</span>
                </button>
              ))}
            </div>
          </div>
          {typeof navigator.share !== "undefined" && (<button onClick={()=>navigator.share({title:`Pool Design: ${projectName}`,text:summaryText})} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#06b6d4,#0284c7)",color:"white",fontWeight:800,fontSize:14,cursor:"pointer"}}>📱 Share via Phone / System Share</button>)}
          <div>
            <div style={{fontSize:11,color:"#64748b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Design Summary Preview</div>
            <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,fontFamily:"monospace",fontSize:11,color:"#94a3b8",lineHeight:1.7,whiteSpace:"pre-wrap",maxHeight:240,overflowY:"auto"}}>{summaryText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function OnboardingModal({ onComplete, userMode, setUserMode, setLen, setWid, setShape, setDepthId, setFinishId }) {
  const [step, setStep] = useState(0);
  const [demoLen, setDemoLen] = useState(30);
  const [demoWid, setDemoWid] = useState(15);
  const [demoShape, setDemoShape] = useState("rectangle");
  const [demoDepth, setDemoDepth] = useState("standard");
  const [demoFinish, setDemoFinish] = useState("pebble");

  const steps = [
    // Step 0: Welcome
    { icon: null, title:"Welcome to Pool Craft Pro", subtitle:"Design Pools. Craft Outdoor Living.", content:(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{textAlign:"center",marginBottom:4}}>
          <svg viewBox="0 0 52 42" width="56" height="44" style={{margin:"0 auto 12px",display:"block"}}>
            <defs>
              <linearGradient id="oN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
              <linearGradient id="oG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
              <linearGradient id="oD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
            </defs>
            <text x="0" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#oN)">F</text>
            <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#oD)"/>
            <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
            <text x="30" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#oG)">P</text>
          </svg>
          <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.7}}>The most complete pool design tool ever built for contractors and homeowners. Design, estimate, render, and close — all in one place.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
          {[{icon:"⚡",label:"AI Renderings",sub:"Grok Aurora"},{icon:"📊",label:"Materials Calc",sub:"Real engineering math"},{icon:"🗺️",label:"Yard Planner",sub:"Drag & drop"},{icon:"💰",label:"Cost Estimator",sub:"Local market rates"},{icon:"📄",label:"Client Proposals",sub:"Close the deal"},{icon:"🏗️",label:"Build Tracker",sub:"Post-sale tool"}].map(f=>(
            <div key={f.label} style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.18)",borderRadius:10,padding:"10px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><span style={{fontSize:18}}>{f.icon}</span><span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{f.label}</span></div>
              <div style={{fontSize:10,color:"#64748b",paddingLeft:26}}>{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    )},
    // Step 1: Who are you
    { icon:"👤", title:"Who's designing today?", subtitle:"We'll tailor the experience for you", content:(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[{id:"contractor",icon:"👷",title:"Pool Contractor / Builder",desc:"Full technical detail — specs, permits, client quotes, build tracking"},{id:"homeowner",icon:"🏠",title:"Homeowner / DIY",desc:"Guided visual design — easy material lists, contractor comparison"},{id:"designer",icon:"🎨",title:"Landscape Designer",desc:"Visual design focus — yard planning, hardscapes, AI renderings"}].map(m=>(
          <button key={m.id} onClick={()=>setUserMode(m.id)} style={{textAlign:"left",padding:"14px 16px",borderRadius:12,border:`2px solid ${userMode===m.id?"#c9a84c":"#1e293b"}`,background:userMode===m.id?"rgba(201,168,76,0.08)":"#0f172a",cursor:"pointer",display:"flex",gap:14,alignItems:"flex-start",transition:"all 0.15s"}}>
            <span style={{fontSize:28,flexShrink:0}}>{m.icon}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14,color:userMode===m.id?"#c9a84c":"#e2e8f0",marginBottom:3}}>{m.title}</div>
              <div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{m.desc}</div>
            </div>
            {userMode===m.id&&<span style={{color:"#c9a84c",fontSize:18,flexShrink:0}}>✓</span>}
          </button>
        ))}
      </div>
    )},
    // Step 2: Design your first pool (guided)
    { icon:"🏊", title:"Design your first pool", subtitle:"Adjust below — you can change everything later", content:(
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14}}>
          <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Shape</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {POOL_SHAPES.map(s=>(
              <button key={s.id} onClick={()=>setDemoShape(s.id)} style={{padding:"7px 12px",borderRadius:20,border:`2px solid ${demoShape===s.id?"#c9a84c":"#334155"}`,background:demoShape===s.id?"rgba(201,168,76,0.1)":"transparent",color:demoShape===s.id?"#c9a84c":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer"}}>{s.label}</button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{label:"Length (ft)",val:demoLen,set:setDemoLen,min:10,max:120},{label:"Width (ft)",val:demoWid,set:setDemoWid,min:8,max:60}].map(f=>(
            <div key={f.label} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:12}}>
              <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>{f.label}</div>
              <div style={{fontSize:24,fontWeight:900,color:"#e2e8f0",textAlign:"center",marginBottom:6}}>{f.val}′</div>
              <input type="range" min={f.min} max={f.max} value={f.val} onChange={e=>f.set(Number(e.target.value))} style={{width:"100%",accentColor:"#c9a84c"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#334155",marginTop:2}}><span>{f.min}′</span><span>{f.max}′</span></div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:12}}>
            <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Depth</div>
            {DEPTHS.map(d=>(
              <button key={d.id} onClick={()=>setDemoDepth(d.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",borderRadius:8,border:`1px solid ${demoDepth===d.id?"#c9a84c":"transparent"}`,background:demoDepth===d.id?"rgba(201,168,76,0.08)":"transparent",color:demoDepth===d.id?"#c9a84c":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:3}}>{d.label}</button>
            ))}
          </div>
          <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:12}}>
            <div style={{fontSize:11,color:"#c9a84c",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Finish</div>
            {POOL_FINISHES.slice(0,4).map(f=>(
              <button key={f.id} onClick={()=>setDemoFinish(f.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",borderRadius:8,border:`1px solid ${demoFinish===f.id?"#c9a84c":"transparent"}`,background:demoFinish===f.id?"rgba(201,168,76,0.08)":"transparent",color:demoFinish===f.id?"#c9a84c":"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:3}}>{f.label}</button>
            ))}
          </div>
        </div>
        <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:10,padding:10,fontSize:12,color:"#22c55e",display:"flex",gap:8,alignItems:"center"}}>
          <span>✓</span><span>Your {demoLen}′×{demoWid}′ {POOL_SHAPES.find(s=>s.id===demoShape)?.label} pool is ready — click Next to apply these settings</span>
        </div>
      </div>
    )},
    // Step 3: Cloud sync
    { icon:"☁️", title:"Sync across all devices", subtitle:"Optional — set up later anytime from Settings", content:(
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:12,padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:6}}>☁️ Cloud Sync via Supabase (Free)</div>
          <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.7}}>By default, projects save only to this device. Connect a free Supabase database (5 minutes, one time) and your projects follow you to any iPhone, iPad, or computer.</div>
        </div>
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,fontSize:12,color:"#64748b",lineHeight:1.7}}>
          <div style={{fontWeight:700,color:"#94a3b8",marginBottom:6}}>To set up cloud sync:</div>
          {["Go to supabase.com — create a free project","Run the setup SQL (in your Settings tab → Cloud Sync)","Paste your project URL and anon key in Settings"].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:4}}><span style={{color:"#c9a84c",flexShrink:0}}>{i+1}.</span>{s}</div>
          ))}
        </div>
        <div style={{fontSize:12,color:"#64748b",textAlign:"center"}}>You can skip this now and set it up later from the Settings tab ⚙️</div>
      </div>
    )},
    // Step 4: Ready
    { icon:"✅", title:"You're all set!", subtitle:"Your pool design is loaded and ready", content:(
      <div style={{display:"flex",flexDirection:"column",gap:14,alignItems:"center"}}>
        <div style={{background:"linear-gradient(135deg,rgba(201,168,76,0.12),rgba(168,135,58,0.06))",border:"1px solid rgba(201,168,76,0.25)",borderRadius:14,padding:20,width:"100%",textAlign:"center"}}>
          <div style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>{demoLen}′ × {demoWid}′ {POOL_SHAPES.find(s=>s.id===demoShape)?.label}</div>
          <div style={{fontSize:13,color:"#c9a84c"}}>{POOL_FINISHES.find(f=>f.id===demoFinish)?.label} Finish · {DEPTHS.find(d=>d.id===demoDepth)?.label}</div>
        </div>
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,width:"100%"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:10}}>Quick tips to get started:</div>
          {[{icon:"🏊",tip:"Use the 3D preview on the Design tab — drag to rotate it"},{icon:"⚡",tip:"Try Quick Render — stand in a backyard and render your pool live"},{icon:"💰",tip:"Cost Est. tab builds a client proposal with one tap"},{icon:"📂",tip:"Save projects with client names using the 💾 button above"},{icon:"🔧",tip:"Add your xAI key in Settings to unlock AI photo rendering"}].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0}}>{t.icon}</span>
              <span style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{t.tip}</span>
            </div>
          ))}
        </div>
      </div>
    )},
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      // Apply the guided design settings
      setLen(demoLen); setWid(demoWid); setShape(demoShape);
      setDepthId(demoDepth); setFinishId(demoFinish);
      try { localStorage.setItem("pc_mode", userMode); localStorage.setItem("pc_onboarded","1"); } catch {}
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:20,width:"100%",maxWidth:500,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.6)",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
        {/* Progress bar */}
        <div style={{height:3,background:"#1e293b",flexShrink:0}}>
          <div style={{height:"100%",width:`${((step+1)/steps.length)*100}%`,background:"linear-gradient(90deg,#c9a84c,#e8c96a)",transition:"width 0.4s"}} />
        </div>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0a0f1e,#0f1e3d)",padding:"24px 24px 20px",textAlign:"center",flexShrink:0}}>
          {current.icon && <div style={{fontSize:44,marginBottom:10}}>{current.icon}</div>}
          <div style={{fontSize:18,fontWeight:800,color:"#e2e8f0",marginBottom:4,fontFamily:"Georgia,serif"}}>{current.title}</div>
          <div style={{fontSize:12,color:"#64748b"}}>{current.subtitle}</div>
        </div>
        {/* Content */}
        <div style={{padding:20,overflowY:"auto",flex:1}}>{current.content}</div>
        {/* Actions */}
        <div style={{padding:"0 20px 20px",display:"flex",gap:10,flexShrink:0}}>
          {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:"13px",borderRadius:10,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontWeight:700,fontSize:14,cursor:"pointer"}}>← Back</button>}
          <button onClick={handleNext} style={{flex:2,padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#c9a84c,#a8873a)",color:"#0a0f1e",fontWeight:800,fontSize:14,cursor:"pointer"}}>
            {isLast ? "Start Designing 🏊" : step === 2 ? "Apply My Pool →" : "Next →"}
          </button>
        </div>
        {!isLast && <div style={{textAlign:"center",paddingBottom:16,flexShrink:0}}><button onClick={()=>{ try{localStorage.setItem("pc_onboarded","1");}catch{} onComplete(); }} style={{background:"none",border:"none",color:"#334155",fontSize:12,cursor:"pointer"}}>Skip setup</button></div>}
      </div>
    </div>
  );
}

// ─── PROJECT MANAGER (cloud-aware) ─────────────────────────────────────────────
function ProjectManager({ currentProjectId, onLoad, onClose }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [renamingClient, setRenamingClient] = useState(null);
  const cloudConnected = !!(getSupabaseConfig().url && getSupabaseConfig().key);

  const refresh = async () => { setLoading(true); const list = await listProjects(); setProjects(list); setLoading(false); };
  useEffect(() => { refresh(); }, []);

  const deleteProject = async (id) => { await deleteProjectRecord(id); setConfirmDelete(null); refresh(); };

  const setProjectClient = async (project, clientName) => {
    const updated = { ...project, clientName: clientName.trim() || null };
    await saveProjectRecord(updated);
    refresh();
  };

  const formatDate = (ts) => ts ? new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "";
  const filtered = search.trim()
    ? projects.filter(p=>(p.name||"").toLowerCase().includes(search.toLowerCase()) || (p.clientName||"").toLowerCase().includes(search.toLowerCase()))
    : projects;

  // Group by client name. Anything without a client goes in "Unassigned".
  const groups = {};
  filtered.forEach(p => {
    const key = p.clientName?.trim() || "Unassigned";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  const groupNames = Object.keys(groups).sort((a,b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  const toggleCollapsed = (name) => setCollapsed(p => ({ ...p, [name]: !p[name] }));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"82vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 20px",borderBottom:"1px solid #1e293b"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0",display:"flex",alignItems:"center",gap:8}}>
              📂 Projects {cloudConnected&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontWeight:700}}>☁️ Synced</span>}
            </div>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",padding:10,margin:-10,minWidth:44,minHeight:44}}>✕</button>
          </div>
          {projects.length>3&&(<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by project or client name..." style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} />)}
        </div>
        <div style={{overflowY:"auto",flex:1,padding:16}}>
          {loading ? (
            <div style={{textAlign:"center",padding:"40px 20px",color:"#64748b",fontSize:13}}>Loading projects...</div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:40,marginBottom:10}}>📂</div>
              <div style={{fontSize:14,color:"#64748b"}}>{search?"No projects match your search":"No saved projects yet"}</div>
              <div style={{fontSize:12,color:"#334155",marginTop:6}}>Use the Save button to store your current design</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {groupNames.map(clientName => {
                const isUnassigned = clientName === "Unassigned";
                const projectsInGroup = groups[clientName];
                const isCollapsed = collapsed[clientName];
                return (
                  <div key={clientName}>
                    <button onClick={()=>toggleCollapsed(clientName)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"4px 0 8px",textAlign:"left"}}>
                      <span style={{color:"#64748b",fontSize:11}}>{isCollapsed?"▶":"▼"}</span>
                      <span style={{fontSize:12,fontWeight:800,color:isUnassigned?"#64748b":"#06b6d4",textTransform:"uppercase",letterSpacing:"0.06em"}}>
                        {isUnassigned?"👤 Unassigned":`👤 ${clientName}`}
                      </span>
                      <span style={{fontSize:11,color:"#334155",fontWeight:600}}>({projectsInGroup.length})</span>
                    </button>
                    {!isCollapsed && (
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {projectsInGroup.map(p=>(
                          <div key={p.id} style={{background:String(p.id)===String(currentProjectId)?"rgba(6,182,212,0.07)":"#0f172a",border:`1px solid ${String(p.id)===String(currentProjectId)?"rgba(6,182,212,0.3)":"#1e293b"}`,borderRadius:12,padding:14}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontWeight:700,fontSize:14,color:"#e2e8f0",marginBottom:4}}>{p.name}{String(p.id)===String(currentProjectId)&&<span style={{fontSize:10,color:"#06b6d4",fontWeight:700,marginLeft:8}}>● CURRENT</span>}</div>
                                <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>{formatDate(p.savedAt)} - {p.shape} {p.len}'x{p.wid}' - {p.gallons?.toLocaleString()} gal</div>
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {p.entryCount>0&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",color:"#06b6d4"}}>{p.entryCount} features</span>}
                                  {p.hardscapeCount>0&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",color:"#f59e0b"}}>{p.hardscapeCount} hardscapes</span>}
                                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.2)",color:"#22c55e"}}>{p.finish}</span>
                                </div>
                                {renamingClient===p.id ? (
                                  <div style={{display:"flex",gap:6,marginTop:8}}>
                                    <input autoFocus defaultValue={p.clientName||""} onKeyDown={e=>{ if(e.key==="Enter"){ setProjectClient(p, e.target.value); setRenamingClient(null);} if(e.key==="Escape") setRenamingClient(null); }} placeholder="Client name..." style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",minHeight:38,color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} id={`client-input-${p.id}`} />
                                    <button onClick={()=>{ const el=document.getElementById(`client-input-${p.id}`); setProjectClient(p, el?el.value:""); setRenamingClient(null); }} style={{padding:"9px 14px",minHeight:38,borderRadius:8,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                                  </div>
                                ) : (
                                  <button onClick={()=>setRenamingClient(p.id)} style={{marginTop:8,fontSize:11,color:"#64748b",background:"none",border:"none",cursor:"pointer",padding:"8px 0",minHeight:36}}>{p.clientName?`✏️ Reassign client`:"+ Assign to a client"}</button>
                                )}
                              </div>
                              <div style={{display:"flex",gap:6,flexShrink:0}}>
                                <button onClick={()=>onLoad(p)} style={{padding:"9px 16px",minHeight:40,borderRadius:8,border:"none",background:"linear-gradient(135deg,#06b6d4,#0284c7)",color:"white",fontWeight:700,fontSize:12,cursor:"pointer"}}>Load</button>
                                {confirmDelete===p.id ? (<button onClick={()=>deleteProject(p.id)} style={{padding:"9px 14px",minHeight:40,borderRadius:8,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700,fontSize:12,cursor:"pointer"}}>Confirm</button>) : (<button onClick={()=>setConfirmDelete(p.id)} style={{width:40,height:40,borderRadius:8,border:"1px solid #334155",background:"#1e293b",color:"#64748b",fontWeight:700,fontSize:14,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑</button>)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {!cloudConnected&&projects.length>0&&(
          <div style={{padding:"10px 16px",borderTop:"1px solid #1e293b",fontSize:11,color:"#64748b",textAlign:"center"}}>💡 These projects are saved to this device only. Connect Cloud Sync on the Design tab to access them anywhere.</div>
        )}
      </div>
    </div>
  );
}

// ─── PDF EXPORT ────────────────────────────────────────────────────────────────
function generatePDF({ projectName, shape, len, wid, depthId, finishId, colorId, materials, equipment, entries, hardscapes, parcelData }) {
  const finishLabel = POOL_FINISHES.find(f=>f.id===finishId)?.label || finishId;
  const colorLabel = POOL_COLORS.find(c=>c.id===colorId)?.label || colorId;
  const depthLabel = DEPTHS.find(d=>d.id===depthId)?.label || depthId;
  const shapeLabel = POOL_SHAPES.find(s=>s.id===shape)?.label || shape;
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
  const date = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const win = window.open("","_blank"); if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Pool Craft Pro — ${projectName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#fff;color:#1e293b;padding:40px}.header{background:linear-gradient(135deg,#0f2027,#203a43);color:white;padding:32px;border-radius:12px;margin-bottom:28px}.logo{font-size:24px;font-weight:800;margin-bottom:4px}.project-name{font-size:20px;font-weight:800;margin:12px 0 4px}.section{margin-bottom:24px}.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#06b6d4;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}.card-label{font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:3px}.card-value{font-size:15px;font-weight:800;color:#0f172a}.material-row{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #f1f5f9}.eq-row{display:flex;justify-content:space-between;align-items:flex-start;padding:9px 12px;border-bottom:1px solid #f1f5f9}.chip{display:inline-block;padding:3px 10px;border-radius:20px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:12px;font-weight:600;margin:3px}.footer{margin-top:36px;padding-top:18px;border-top:2px solid #e2e8f0;font-size:11px;color:#94a3b8}@media print{body{padding:20px}}</style></head><body>
  <div class="header"><div class="logo"><strong style="font-size:18px;color:#1a2f5e;font-family:Georgia,serif;letter-spacing:2px">POOL <span style="color:#c9a84c">CRAFT</span> PRO</strong><br><span style="font-size:11px;color:#94a3b8">Design Pools. Craft Outdoor Living.<</div><div class="project-name">${projectName}</div><div style="font-size:12px;color:#94a3b8">Generated ${date}</div>${parcelData?`<div style="font-size:12px;color:#94a3b8;margin-top:6px">📍 ${parcelData.address}</div>`:""}</div>
  <div class="section"><div class="section-title">Pool Design Summary</div><div class="grid-2"><div class="card"><div class="card-label">Size</div><div class="card-value">${len}' x ${wid}'</div></div><div class="card"><div class="card-label">Shape</div><div class="card-value">${shapeLabel}</div></div><div class="card"><div class="card-label">Depth Profile</div><div class="card-value" style="font-size:13px">${depthLabel}</div></div><div class="card"><div class="card-label">Volume</div><div class="card-value">${materials.gallons.toLocaleString()} gal</div></div><div class="card"><div class="card-label">Water Color</div><div class="card-value" style="font-size:13px">${colorLabel}</div></div><div class="card"><div class="card-label">Finish</div><div class="card-value" style="font-size:13px">${finishLabel}</div></div></div></div>
  ${activeEntries.length>0?`<div class="section"><div class="section-title">Pool Features & Entry</div><div>${activeEntries.map(e=>`<span class="chip">${e.icon} ${e.label}</span>`).join("")}</div></div>`:""}
  <div class="section"><div class="section-title">Materials Takeoff</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">${[{l:"Excavation",v:materials.excavation},{l:"Gunite / Shotcrete",v:materials.gunite},{l:"Rebar (#3)",v:materials.rebar},{l:"Gravel Base",v:materials.gravel},{l:"PVC Plumbing",v:materials.plumbing},{l:"Coping",v:materials.coping},{l:"Interior Finish",v:materials.finish}].map(r=>`<div class="material-row"><span style="font-weight:600">${r.l}</span><span style="font-weight:800;color:#0284c7">${r.v}</span></div>`).join("")}</div></div>
  ${activeHardscapes.length>0?`<div class="section"><div class="section-title">Hardscape Elements</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">${activeHardscapes.map(h=>`<div class="material-row"><span style="font-weight:600">${h.icon} ${h.label}</span><span style="font-weight:800;color:#0284c7">${h.unit==="unit"?"1 unit":`${hardscapes[h.id]} ${h.unit}`}</span></div>`).join("")}</div></div>`:""}
  <div class="section"><div class="section-title">Recommended Pentair Equipment</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">${equipment.map(eq=>`<div class="eq-row"><div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase">${eq.label}</div><div style="font-size:13px;font-weight:700;margin-top:2px">${eq.model}</div><div style="font-size:11px;color:#64748b;margin-top:2px">${eq.note}</div></div><div style="font-size:11px;font-family:monospace;background:#e2e8f0;padding:2px 8px;border-radius:6px;white-space:nowrap">${eq.sku}</div></div>`).join("")}</div></div>
  <div class="footer">Pool Craft Pro — Design Pools. Craft Outdoor Living.<br>All material quantities are estimates. Verify with your licensed pool contractor. Always obtain proper permits before construction.</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),800);</script></body></html>`);
  win.document.close();
}

// ─── CLIENT PROPOSAL (sales-facing document) ──────────────────────────────────
// Distinct from generatePDF: this is meant to be shown to or emailed directly
// to the client to close the sale, not an internal materials/build reference.
function generateProposal({ projectName, clientName, shape, len, wid, depthId, finishId, colorId, entries, hardscapes, materials, items, totalLow, totalHigh }) {
  const shapeLabel = POOL_SHAPES.find(s=>s.id===shape)?.label || shape;
  const finishLabel = POOL_FINISHES.find(f=>f.id===finishId)?.label || finishId;
  const depthLabel = DEPTHS.find(d=>d.id===depthId)?.label || depthId;
  const colorLabel = POOL_COLORS.find(c=>c.id===colorId)?.label || "Crystal Blue";
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h=>hardscapes[h.id]!=null);
  const date = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const validUntil = new Date(Date.now()+30*24*60*60*1000).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const cats = [...new Set(items.map(i=>i.cat))];
  const catLabels = { "Pool Structure":"Pool Construction", "Entry & Features":"Pool Features & Entries", "Hardscapes":"Outdoor Living & Hardscapes", "Equipment":"Equipment Package", "Labor":"Labor, Permits & Engineering" };

  const win = window.open("","_blank"); if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Pool Proposal — ${clientName || projectName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:"Inter",system-ui,sans-serif;background:#fff;color:#1e293b;line-height:1.5;-webkit-font-smoothing:antialiased}
    /* ── COVER ── */
    .cover{background:linear-gradient(145deg,#0a0f1e 0%,#0f1e3d 55%,#0a0f1e 100%);color:white;padding:64px 56px 72px;min-height:320px;position:relative;overflow:hidden}
    .cover::before{content:'';position:absolute;top:-30%;right:-10%;width:60%;height:160%;background:radial-gradient(ellipse,rgba(201,168,76,0.12) 0%,transparent 70%);pointer-events:none}
    .cover-logo{display:flex;align-items:center;gap:14px;margin-bottom:52px}
    .cover-logo-badge{width:52px;height:52px;border-radius:13px;background:linear-gradient(135deg,#1a2f5e,#0f1e3d);border:1px solid rgba(201,168,76,0.4);display:flex;align-items:center;justify-content:center}
    .cover-wordmark{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;font-weight:600;letter-spacing:3px;line-height:1.1}
    .cover-wordmark span{color:#c9a84c}
    .cover-tagline{font-size:10px;color:#8a9ab5;letter-spacing:2.5px;text-transform:uppercase;margin-top:3px;font-family:"Inter",sans-serif}
    .cover h1{font-family:"Cormorant Garamond",Georgia,serif;font-size:44px;font-weight:300;line-height:1.15;margin-bottom:16px;letter-spacing:-0.5px}
    .cover-for{font-size:12px;color:#8a9ab5;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px}
    .cover-client{font-family:"Cormorant Garamond",Georgia,serif;font-size:26px;font-weight:400;color:#e8c96a;margin-bottom:24px}
    .cover-meta{font-size:12px;color:#64748b;display:flex;gap:20px;flex-wrap:wrap}
    .cover-meta span{display:flex;align-items:center;gap:6px}
    .cover-divider{width:48px;height:1px;background:rgba(201,168,76,0.4);margin:28px 0}
    /* ── BODY ── */
    .body{padding:52px 56px}
    .section{margin-bottom:40px}
    .section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#c9a84c;margin-bottom:16px;display:flex;align-items:center;gap:10px}
    .section-label::after{content:'';flex:1;height:1px;background:#e2e8f0}
    /* ── SPEC GRID ── */
    .spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .spec{background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #f1f5f9}
    .spec label{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:6px;font-weight:600}
    .spec span{font-family:"Cormorant Garamond",Georgia,serif;font-size:20px;font-weight:600;color:#0f172a;line-height:1.2}
    /* ── HIGHLIGHTS ── */
    .highlight-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:4px}
    .highlight{background:linear-gradient(135deg,#0a0f1e,#0f1e3d);border-radius:10px;padding:16px;text-align:center;border:1px solid rgba(201,168,76,0.15)}
    .highlight .val{font-family:"Cormorant Garamond",Georgia,serif;font-size:24px;font-weight:600;color:#c9a84c}
    .highlight .lbl{font-size:10px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.06em}
    /* ── FEATURES ── */
    .feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .feature-pill{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px}
    /* ── INVESTMENT TABLE ── */
    .invest-table{width:100%;border-collapse:collapse}
    .invest-table th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;padding:10px 0;border-bottom:2px solid #0f172a;font-weight:700}
    .invest-table td{padding:14px 0;border-bottom:1px solid #f1f5f9;font-size:14px;vertical-align:top}
    .invest-table .cat-name{font-weight:600;color:#0f172a}
    .invest-table .cat-note{font-size:11px;color:#94a3b8;margin-top:2px}
    .invest-table .amt{text-align:right;font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;font-weight:600;color:#0284c7;white-space:nowrap}
    /* ── TOTAL BANNER ── */
    .total-banner{background:linear-gradient(135deg,#0a0f1e,#1a2f5e);color:white;border-radius:16px;padding:36px 40px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}
    .total-banner .left-side .label{font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8a9ab5;margin-bottom:8px}
    .total-banner .amount{font-family:"Cormorant Garamond",Georgia,serif;font-size:46px;font-weight:300;color:white;letter-spacing:-1px}
    .total-banner .right-side{text-align:right}
    .total-banner .note{font-size:12px;color:#64748b;margin-top:8px}
    .total-banner .gold-badge{background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:10px 18px;font-size:12px;color:#c9a84c;font-weight:700}
    /* ── VALIDITY ── */
    .validity{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;font-size:13px;color:#92400e;margin-top:16px;display:flex;gap:10px;align-items:flex-start}
    /* ── NEXT STEPS ── */
    .steps{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .step{display:flex;gap:14px;align-items:flex-start;background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #f1f5f9}
    .step-num{min-width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#a8873a);color:#0a0f1e;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0}
    .step-text{font-size:13px;color:#374151;line-height:1.5;padding-top:3px}
    .step-text strong{color:#0f172a;display:block;margin-bottom:3px}
    /* ── MATERIALS PAGE ── */
    .page-break{page-break-before:always}
    .materials-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px}
    .mat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center}
    .mat-label{font-size:12px;color:#64748b;font-weight:500}
    .mat-val{font-family:"Cormorant Garamond",Georgia,serif;font-size:17px;font-weight:600;color:#0284c7}
    /* ── FOOTER ── */
    .footer{margin-top:48px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;line-height:1.8;display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
    @media print{
      .cover{padding:40px;min-height:auto}
      .body{padding:40px}
      .page-break{page-break-before:always}
    }
  </style></head><body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-logo">
      <div class="cover-logo-badge">
        <svg viewBox="0 0 52 42" width="34" height="27">
          <defs>
            <linearGradient id="pN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6aaee8"/><stop offset="100%" stop-color="#1a2f5e"/></linearGradient>
            <linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e8c96a"/><stop offset="100%" stop-color="#a8873a"/></linearGradient>
            <linearGradient id="pD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6aaee8"/><stop offset="100%" stop-color="#1a5fa8"/></linearGradient>
          </defs>
          <text x="0" y="34" font-family="Georgia,serif" font-weight="700" font-size="34" fill="url(#pN)">F</text>
          <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#pD)"/>
          <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
          <text x="30" y="34" font-family="Georgia,serif" font-weight="700" font-size="34" fill="url(#pG)">P</text>
        </svg>
      </div>
      <div>
        <div class="cover-wordmark">POOL <span>CRAFT</span> PRO</div>
        <div class="cover-tagline">Design Pools. Craft Outdoor Living.</div>
      </div>
    </div>
    <h1>Your Pool Design<br>Proposal</h1>
    <div class="cover-for">Prepared exclusively for</div>
    <div class="cover-client">${clientName || "Valued Customer"}</div>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      <span>📋 ${projectName}</span>
      <span>📅 ${date}</span>
      <span>📍 Valid through ${validUntil}</span>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Pool Highlights -->
    <div class="section">
      <div class="section-label">At a Glance</div>
      <div class="highlight-row">
        <div class="highlight"><div class="val">${len}' × ${wid}'</div><div class="lbl">Dimensions</div></div>
        <div class="highlight"><div class="val">${materials.gallons.toLocaleString()}</div><div class="lbl">Gallons</div></div>
        <div class="highlight"><div class="val">${activeEntries.length + activeHardscapes.length}</div><div class="lbl">Features</div></div>
        <div class="highlight"><div class="val">${shapeLabel}</div><div class="lbl">Shape</div></div>
      </div>
    </div>

    <!-- Pool Specifications -->
    <div class="section">
      <div class="section-label">Pool Specifications</div>
      <div class="spec-grid">
        <div class="spec"><label>Shape</label><span>${shapeLabel}</span></div>
        <div class="spec"><label>Dimensions</label><span>${len}' × ${wid}'</span></div>
        <div class="spec"><label>Depth Profile</label><span>${depthLabel}</span></div>
        <div class="spec"><label>Water Volume</label><span>${materials.gallons.toLocaleString()} gal</span></div>
        <div class="spec"><label>Interior Finish</label><span>${finishLabel}</span></div>
        <div class="spec"><label>Water Color</label><span>${colorLabel}</span></div>
      </div>
    </div>

    ${activeEntries.length > 0 ? `
    <!-- Pool Features -->
    <div class="section">
      <div class="section-label">Pool Features Included</div>
      <div class="feature-grid">
        ${activeEntries.map(e=>`<div class="feature-pill"><span>${e.icon}</span>${e.label}</div>`).join("")}
      </div>
    </div>` : ""}

    ${activeHardscapes.length > 0 ? `
    <!-- Outdoor Living -->
    <div class="section">
      <div class="section-label">Outdoor Living Features</div>
      <div class="feature-grid">
        ${activeHardscapes.map(h=>`<div class="feature-pill"><span>${h.icon}</span>${h.label}</div>`).join("")}
      </div>
    </div>` : ""}

    <!-- Investment -->
    <div class="section">
      <div class="section-label">Your Investment</div>
      <table class="invest-table">
        <thead><tr><th style="width:60%">Category</th><th class="amt">Estimated Range</th></tr></thead>
        <tbody>
          ${cats.map(cat => {
            const ci = items.filter(i=>i.cat===cat);
            const lo = ci.reduce((s,i)=>s+i.low,0), hi = ci.reduce((s,i)=>s+i.high,0);
            const notes = { "Pool Structure":"Excavation, gunite shell, coping, interior finish", "Entry & Features":"All selected water features and specialty entries", "Hardscapes":"Decking, outdoor living structures and surfaces", "Equipment":"Full Pentair equipment package", "Labor":"Labor, permits, engineering, and site prep" };
            return `<tr><td><div class="cat-name">${catLabels[cat]||cat}</div><div class="cat-note">${notes[cat]||""}</div></td><td class="amt">${fmt(lo)} – ${fmt(hi)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
      <div class="total-banner">
        <div class="left-side">
          <div class="label">Total Project Investment</div>
          <div class="amount">${fmt(totalLow)} – ${fmt(totalHigh)}</div>
          <div class="note">Final pricing confirmed after site visit & contract</div>
        </div>
        <div class="right-side">
          <div class="gold-badge">💰 Midpoint: ${fmt(Math.round((totalLow+totalHigh)/2/1000)*1000)}</div>
        </div>
      </div>
      <div class="validity">
        <span>📅</span>
        <span>This proposal is valid through <strong>${validUntil}</strong>. Pricing reflects current regional material and labor costs. Subject to site verification and final contract.</span>
      </div>
    </div>

    <!-- Next Steps -->
    <div class="section">
      <div class="section-label">What Happens Next</div>
      <div class="steps">
        <div class="step"><div class="step-num">1</div><div class="step-text"><strong>Site Visit</strong>We schedule an in-person visit to confirm measurements, access, soil conditions, and any site-specific requirements.</div></div>
        <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Final Contract</strong>We finalize your contract with locked pricing, material selections confirmed, and a projected construction start date.</div></div>
        <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Permits Filed</strong>We submit your permit application to the local building department and coordinate with the utility locate service.</div></div>
        <div class="step"><div class="step-num">4</div><div class="step-text"><strong>Build Begins</strong>Construction starts — typically 6-10 weeks from groundbreaking to your first swim.</div></div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div style="max-width:480px">This proposal provides estimated pricing for budgeting and decision-making purposes based on typical regional construction costs. It is not a final contract or fixed-price quote. Final pricing is confirmed after an in-person site evaluation. Excludes engineering fees, utility relocation, HOA fees, and unforeseen site conditions. All work subject to local permit approval.</div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;font-weight:600;color:#0f172a;letter-spacing:1px">POOL <span style="color:#c9a84c">CRAFT</span> PRO</div>
        <div>poolcraftpro.ai</div>
      </div>
    </div>
  </div>

  <!-- PAGE 2: MATERIALS REFERENCE -->
  <div class="page-break">
    <div class="body">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:36px">
        <div>
          <div style="font-size:10px;color:#c9a84c;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Materials Reference</div>
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:300">Estimated Quantities</div>
        </div>
        <div style="font-size:12px;color:#94a3b8;text-align:right">${len}' × ${wid}' ${shapeLabel}<br>${clientName||projectName}</div>
      </div>
      <div class="materials-grid">
        <div class="mat-card"><span class="mat-label">Excavation</span><span class="mat-val">${materials.excavation}</span></div>
        <div class="mat-card"><span class="mat-label">Gunite / Shotcrete</span><span class="mat-val">${materials.gunite}</span></div>
        <div class="mat-card"><span class="mat-label">Rebar (#3 bar)</span><span class="mat-val">${materials.rebar}</span></div>
        <div class="mat-card"><span class="mat-label">PVC Plumbing</span><span class="mat-val">${materials.plumbing}</span></div>
        <div class="mat-card"><span class="mat-label">Coping</span><span class="mat-val">${materials.coping}</span></div>
        <div class="mat-card"><span class="mat-label">Interior Finish Area</span><span class="mat-val">${materials.finish}</span></div>
        <div class="mat-card"><span class="mat-label">Waterline Tile</span><span class="mat-val">${materials.tile}</span></div>
        <div class="mat-card"><span class="mat-label">Total Pool Volume</span><span class="mat-val">${materials.gallons.toLocaleString()} gal</span></div>
      </div>
      <div style="margin-top:24px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;color:#64748b;line-height:1.7">
        <strong style="color:#0f172a;display:block;margin-bottom:4px">About These Estimates</strong>
        Rebar calculated at #3 bar on 12" grid spacing with 15% lap splice allowance, displayed in sticks (20 ft) and total linear feet. Excavation includes 15% over-dig for formwork. Gunite at 4" shell thickness. All quantities for reference — final takeoff by licensed contractor.
      </div>
      <div class="footer" style="margin-top:32px">
        <div>Materials estimates are for budgeting reference only. Actual quantities determined by licensed contractor after final engineering drawings. Prepared by Pool Craft Pro · poolcraftpro.ai</div>
        <div style="text-align:right;flex-shrink:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:1px">POOL CRAFT PRO</div>
      </div>
    </div>
  </div>

  <script>window.onload=()=>setTimeout(()=>window.print(),800);</script>
  </body></html>`);
  win.document.close();
}

// ─── SETTINGS SCREEN ─────────────────────────────────────────────────────────
// One place for all API keys, affiliate tags, and app preferences.
// Replaces the scattered key panels across tabs.
function SettingsScreen({ userMode, setUserMode, onSwitchMode }) {
  const [xaiKey, setXaiKey] = useState(()=>{
    if(import.meta.env.VITE_XAI_KEY) return import.meta.env.VITE_XAI_KEY;
    try{return localStorage.getItem("xai_dev_key")||"";}catch{return "";}
  });
  const [gmapsKey, setGmapsKey] = useState(()=>{
    if(import.meta.env.VITE_GMAPS_KEY) return import.meta.env.VITE_GMAPS_KEY;
    try{return localStorage.getItem("pc_gmaps_key")||"";}catch{return "";}
  });
  const [regridKey, setRegridKey] = useState(()=>{ try{return localStorage.getItem("pc_regrid_key")||"";}catch{return "";} });
  const supabaseCfg = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(supabaseCfg.url);
  const [sbKey, setSbKey] = useState(supabaseCfg.key?"●●●●●●●●":"");
  const [amazonTag, setAmazonTag] = useState(()=>{ try{return localStorage.getItem("pc_tag_amazon")||AFFILIATE_TAGS.amazon;}catch{return AFFILIATE_TAGS.amazon;} });
  const [hdTag, setHdTag] = useState(()=>{ try{return localStorage.getItem("pc_tag_hd")||AFFILIATE_TAGS.homedepot;}catch{return AFFILIATE_TAGS.homedepot;} });
  const [saved, setSaved] = useState(null);

  const save = (field, value, storageKey) => {
    try { localStorage.setItem(storageKey, value.trim()); } catch {}
    setSaved(field); setTimeout(()=>setSaved(null), 1800);
  };

  const KeyRow = ({ label, value, setValue, storageKey, placeholder, hint, isSet }) => (
    <div style={{background:"#0f172a",border:`1px solid ${isSet?"rgba(34,197,94,0.3)":"#1e293b"}`,borderRadius:12,padding:14,marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{label}</div>
        {isSet ? <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(34,197,94,0.15)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontWeight:700}}>✅ Active</span>
               : <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b",fontWeight:700}}>⚠️ Not set</span>}
      </div>
      {hint&&<div style={{fontSize:11,color:"#64748b",marginBottom:8,lineHeight:1.5}}>{hint}</div>}
      <div style={{display:"flex",gap:8}}>
        <input type="password" value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}
          style={{flex:1,background:"#1e293b",border:`1px solid ${saved===label?"#22c55e":"#334155"}`,borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none"}}/>
        <button onClick={()=>save(label, value, storageKey)} disabled={!value.trim()||value==="●●●●●●●●"}
          style={{padding:"9px 16px",borderRadius:8,background:value.trim()&&value!=="●●●●●●●●"?"linear-gradient(135deg,#22c55e,#16a34a)":"#1e293b",border:"none",color:"white",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>
          {saved===label?"✓ Saved!":"Save"}
        </button>
        {isSet&&<button onClick={()=>{ save(label,"",storageKey); setValue(""); }}
          style={{padding:"9px 12px",borderRadius:8,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>✕</button>}
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.12),rgba(2,132,199,0.06))",border:"1px solid rgba(6,182,212,0.25)",borderRadius:14,padding:14}}>
        <div style={{fontSize:14,fontWeight:800,color:"#06b6d4",marginBottom:4}}>🔧 App Settings</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>All your API keys and affiliate tags live here. Keys are stored only on your device and never sent to anyone other than the service they're for.</div>
      </div>

      {/* User Mode */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#06b6d4",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>👤 Your Profile</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[{id:"contractor",icon:"👷",label:"Pool Contractor / Builder",desc:"Full technical detail, permits, client tools"},{id:"homeowner",icon:"🏠",label:"Homeowner / DIY",desc:"Simplified visual design, guided steps"},{id:"designer",icon:"🎨",label:"Landscape Designer",desc:"Visual design focus, hardscapes, renderings"}].map(m=>(
            <button key={m.id} onClick={()=>{ setUserMode(m.id); try{localStorage.setItem("pc_mode",m.id);}catch{} }}
              style={{textAlign:"left",padding:"12px 14px",borderRadius:10,border:`2px solid ${userMode===m.id?"#06b6d4":"#1e293b"}`,background:userMode===m.id?"rgba(6,182,212,0.08)":"#0f172a",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22}}>{m.icon}</span>
              <div><div style={{fontSize:13,fontWeight:700,color:userMode===m.id?"#06b6d4":"#e2e8f0"}}>{m.label}</div><div style={{fontSize:11,color:"#64748b",marginTop:2}}>{m.desc}</div></div>
              {userMode===m.id&&<span style={{marginLeft:"auto",color:"#06b6d4",fontSize:16}}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* AI Rendering */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#a78bfa",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>🚀 Grok Aurora — AI Pool Rendering</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Powers the AI rendering feature. Get a free key + $25 credits at console.x.ai (separate from your Super Grok subscription).</div>
        <KeyRow label="xAI API Key" value={xaiKey} setValue={setXaiKey} storageKey="xai_dev_key" placeholder="xai-..." isSet={!!xaiKey} hint={null}/>
      </div>

      {/* Maps & Parcel */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#06b6d4",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>🛰️ Property Lookup & Maps</div>
        <KeyRow label="Google Maps API Key" value={gmapsKey} setValue={setGmapsKey} storageKey="pc_gmaps_key" placeholder="AIza..." isSet={!!gmapsKey}
          hint="Free 28,000 map loads/month. Enable at console.cloud.google.com → Maps Static API → Credentials."/>
        <KeyRow label="Regrid API Key (Parcel Data)" value={regridKey} setValue={setRegridKey} storageKey="pc_regrid_key" placeholder="Paste Regrid key..." isSet={!!regridKey}
          hint="Optional — enables real lot size, zoning & setback data. Sign up at regrid.com. App works with estimated data until this is set."/>
      </div>

      {/* Cloud Sync */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#22c55e",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>☁️ Cloud Sync (Supabase)</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Sync projects across all your devices. Free at supabase.com. Create a project, run the setup SQL, then paste your URL and anon key.</div>
        <CloudSyncPanel />
      </div>

      {/* Affiliate Tags */}
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>💰 Affiliate Tags — Your Revenue</div>
        <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Replace the placeholders below with your real affiliate IDs. Every product link in the app includes your tag automatically.</div>
        <KeyRow label="Amazon Associates Tag" value={amazonTag} setValue={setAmazonTag} storageKey="pc_tag_amazon" placeholder="yourname-20" isSet={!amazonTag.includes("YOURTAG")} hint="Sign up at affiliate-program.amazon.com"/>
        <KeyRow label="Home Depot Affiliate Tag" value={hdTag} setValue={setHdTag} storageKey="pc_tag_hd" placeholder="Your HD tag" isSet={!hdTag.includes("YOUR_HD")} hint="Sign up at homedepot.com/affiliate"/>
      </div>

      {/* Version / About */}
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:14,textAlign:"center"}}>
        <div style={{fontSize:13,fontWeight:800,color:"#e2e8f0",marginBottom:4,fontFamily:"Georgia,serif",letterSpacing:"2px"}}>
          <span style={{color:"#dde6f0"}}>POOL </span><span style={{color:"#c9a84c"}}>CRAFT </span><span style={{color:"#dde6f0"}}>PRO</span>
        </div>
        <div style={{fontSize:10,color:"#8a9ab5",letterSpacing:"2px",textTransform:"uppercase",marginBottom:8}}>Design Pools. Craft Outdoor Living.</div>
        <div style={{fontSize:11,color:"#64748b",lineHeight:1.7}}>Version 1.0 · poolcraftpro.ai · Built with React<br/>AI rendering by xAI Grok Aurora · Maps by Google<br/>Parcel data by Regrid · Cloud sync by Supabase</div>
      </div>
    </div>
  );
}

// ─── QUOTE BUILDER ────────────────────────────────────────────────────────────
// Contractor-facing tool: take the cost estimate, apply a markup, add custom
// line items, and produce a formal quote with a bottom-line number.
function QuoteBuilder({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates, projectName, clientName }) {
  const { items, totalLow, totalHigh } = computeCostItems({ shape, len, wid, depthId, finishId, entries, hardscapes, extras, localRates });
  const [markup, setMarkup] = useState(15); // % contractor markup
  const [useHigh, setUseHigh] = useState(false); // use high or midpoint estimate as base
  const [customLines, setCustomLines] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [contingency, setContingency] = useState(10);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const base = useHigh ? totalHigh : Math.round((totalLow+totalHigh)/2);
  const markupAmt = Math.round(base * markup / 100);
  const customTotal = customLines.reduce((s,l)=>s+l.amount,0);
  const subtotal = base + markupAmt + customTotal;
  const contingencyAmt = Math.round(subtotal * contingency / 100);
  const grandTotal = subtotal + contingencyAmt;

  const addLine = () => {
    const amt = Number(newAmount.replace(/[^0-9.-]/g,""));
    if (!newLabel.trim() || !Number.isFinite(amt)) return;
    setCustomLines(p=>[...p, { id:Date.now(), label:newLabel.trim(), amount:amt }]);
    setNewLabel(""); setNewAmount("");
  };
  const removeLine = (id) => setCustomLines(p=>p.filter(l=>l.id!==id));

  const printQuote = () => {
    const win = window.open("","_blank"); if(!win) return;
    const date = new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    const validUntil = new Date(Date.now()+30*24*60*60*1000).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    win.document.write(`<!DOCTYPE html><html><head><title>Quote - ${clientName||projectName}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,system-ui,sans-serif;background:#fff;color:#1e293b;padding:40px}
    h1{font-size:22px;font-weight:800;margin-bottom:4px}h2{font-size:14px;font-weight:700;margin:20px 0 10px;text-transform:uppercase;letter-spacing:0.07em;color:#64748b}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
    .total-row{display:flex;justify-content:space-between;padding:16px 20px;background:#0f172a;color:white;border-radius:12px;font-size:18px;font-weight:800;margin-top:16px}
    .footer{margin-top:30px;font-size:11px;color:#94a3b8;line-height:1.7;border-top:1px solid #e2e8f0;padding-top:16px}
    @media print{body{padding:20px}}</style></head><body>
    <h1>Construction Quote</h1>
    <div style="font-size:13px;color:#64748b;margin-bottom:20px">${clientName?`Prepared for: ${clientName} | `:""}${projectName} | ${date}</div>
    <h2>Scope</h2>
    <div class="row"><span>${len}' × ${wid}' ${POOL_SHAPES.find(s=>s.id===shape)?.label||shape}</span><span>${POOL_FINISHES.find(f=>f.id===finishId)?.label||finishId} finish</span></div>
    <h2>Cost Breakdown</h2>
    ${[...new Set(items.map(i=>i.cat))].map(cat=>{
      const ci=items.filter(i=>i.cat===cat), lo=ci.reduce((s,i)=>s+i.low,0), hi=ci.reduce((s,i)=>s+i.high,0);
      return `<div class="row"><span>${cat}</span><span style="font-weight:600">${fmt(useHigh?hi:Math.round((lo+hi)/2))}</span></div>`;
    }).join("")}
    ${customLines.map(l=>`<div class="row"><span>${l.label}</span><span style="font-weight:600">${fmt(l.amount)}</span></div>`).join("")}
    <div class="row" style="font-weight:700"><span>Contractor Margin (${markup}%)</span><span>${fmt(markupAmt)}</span></div>
    ${contingency>0?`<div class="row"><span>Contingency Reserve (${contingency}%)</span><span>${fmt(contingencyAmt)}</span></div>`:""}
    <div class="total-row"><span>Total Quote</span><span>${fmt(grandTotal)}</span></div>
    <div style="margin-top:12px;padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e">
      ⏰ This quote is valid through <strong>${validUntil}</strong>. Pricing is subject to site verification.
    </div>
    <div class="footer">Quote prepared by Pool Craft Pro · poolcraftpro.ai. This quote is based on a visual design review and estimated material costs. Final pricing is confirmed after a physical site inspection. Excludes engineering fees, utility relocation, and unforeseen site conditions. All work subject to local permit approval.</div>
    <script>window.onload=()=>setTimeout(()=>window.print(),600);</script></body></html>`);
    win.document.close();
  };

  const cats = [...new Set(items.map(i=>i.cat))];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.06))",border:"1px solid rgba(245,158,11,0.3)",borderRadius:14,padding:14}}>
        <div style={{fontSize:14,fontWeight:800,color:"#f59e0b",marginBottom:4}}>📋 Quote Builder</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Apply your contractor margin, add custom line items, and generate a formal quote to send to the client. This is separate from the cost estimate — it's the number you stand behind.</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em"}}>Quote Base</div>
        <div style={{display:"flex",gap:8}}>
          {[{id:false,label:"Midpoint Estimate"},{id:true,label:"High Estimate"}].map(opt=>(
            <button key={String(opt.id)} onClick={()=>setUseHigh(opt.id)} style={{flex:1,padding:"10px",borderRadius:10,border:`2px solid ${useHigh===opt.id?"#f59e0b":"#1e293b"}`,background:useHigh===opt.id?"rgba(245,158,11,0.1)":"#0f172a",color:useHigh===opt.id?"#f59e0b":"#64748b",fontWeight:700,fontSize:12,cursor:"pointer"}}>{opt.label}</button>
          ))}
        </div>
        <div style={{textAlign:"center",padding:"12px",background:"#0f172a",borderRadius:10}}>
          <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Base (before margin)</div>
          <div style={{fontSize:28,fontWeight:900,color:"#e2e8f0"}}>{fmt(base)}</div>
        </div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:700,color:"#f59e0b"}}>Contractor Margin</span>
          <span style={{fontSize:14,fontWeight:800,color:"#f59e0b"}}>{markup}% = {fmt(markupAmt)}</span>
        </div>
        <input type="range" min={0} max={40} step={1} value={markup} onChange={e=>setMarkup(Number(e.target.value))} style={{width:"100%",accentColor:"#f59e0b"}}/>
        <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Industry standard: 10-20% for residential pools</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>Contingency Reserve</span>
          <span style={{fontSize:14,fontWeight:800,color:"#94a3b8"}}>{contingency}% = {fmt(contingencyAmt)}</span>
        </div>
        <input type="range" min={0} max={20} step={1} value={contingency} onChange={e=>setContingency(Number(e.target.value))} style={{width:"100%",accentColor:"#64748b"}}/>
        <div style={{fontSize:11,color:"#64748b",marginTop:4}}>Covers unexpected site conditions, material price changes</div>
      </div>

      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#06b6d4",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>+ Custom Line Items</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {customLines.map(l=>(
            <div key={l.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#0f172a",borderRadius:8,border:"1px solid #1e293b"}}>
              <span style={{flex:1,fontSize:13,color:"#e2e8f0"}}>{l.label}</span>
              <span style={{fontSize:13,fontWeight:700,color:l.amount<0?"#ef4444":"#22c55e"}}>{l.amount<0?"-":""}{fmt(Math.abs(l.amount))}</span>
              <button onClick={()=>removeLine(l.id)} style={{background:"none",border:"none",color:"#64748b",cursor:"pointer",fontSize:14,padding:"4px",minWidth:28,minHeight:28}}>✕</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Line item description" style={{flex:2,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
          <input value={newAmount} onChange={e=>setNewAmount(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addLine()} placeholder="$ amount" style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"9px 10px",color:"#e2e8f0",fontSize:12,outline:"none"}}/>
          <button onClick={addLine} style={{padding:"9px 14px",borderRadius:8,background:"rgba(6,182,212,0.15)",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>+ Add</button>
        </div>
        <div style={{fontSize:11,color:"#64748b",marginTop:6}}>Use negative amounts for discounts</div>
      </div>

      <div style={{background:"linear-gradient(135deg,#0f2027,#1a3a4a)",border:"1px solid rgba(6,182,212,0.3)",borderRadius:16,padding:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Total Quote</div>
        <div style={{fontSize:40,fontWeight:900,color:"#06b6d4",letterSpacing:"-1px"}}>{fmt(grandTotal)}</div>
        <div style={{fontSize:12,color:"#64748b",marginTop:6}}>{len}'×{wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} · {markup}% margin · {contingency}% contingency</div>
        <button onClick={()=>setShowBreakdown(p=>!p)} style={{marginTop:10,background:"none",border:"none",color:"#64748b",fontSize:12,cursor:"pointer"}}>{showBreakdown?"▲ Hide":"▼ Show"} full breakdown</button>
      </div>

      {showBreakdown && (
        <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:12,overflow:"hidden"}}>
          {cats.map(cat=>{
            const ci=items.filter(i=>i.cat===cat);
            const lo=ci.reduce((s,i)=>s+i.low,0), hi=ci.reduce((s,i)=>s+i.high,0);
            return <div key={cat} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#94a3b8"}}>{cat}</span><span style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{fmt(useHigh?hi:Math.round((lo+hi)/2))}</span></div>;
          })}
          {customLines.map(l=>(<div key={l.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#06b6d4"}}>{l.label}</span><span style={{fontSize:13,fontWeight:700,color:l.amount<0?"#ef4444":"#22c55e"}}>{fmt(l.amount)}</span></div>))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#f59e0b"}}>Contractor Margin ({markup}%)</span><span style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>{fmt(markupAmt)}</span></div>
          {contingency>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid #0f172a"}}><span style={{fontSize:13,color:"#64748b"}}>Contingency ({contingency}%)</span><span style={{fontSize:13,fontWeight:700,color:"#64748b"}}>{fmt(contingencyAmt)}</span></div>}
        </div>
      )}

      <button onClick={printQuote} style={{width:"100%",padding:"16px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 4px 20px rgba(245,158,11,0.3)"}}>
        📄 Print / Export Formal Quote {clientName?`for ${clientName}`:""}
      </button>
    </div>
  );
}

// ─── BUILD TIMELINE ───────────────────────────────────────────────────────────
function BuildTimeline({ shape, len, wid, depthId, entries, hardscapes }) {
  const hasInfinity = !!entries?.infinity_edge;
  const hasSpa = !!entries?.spa_attached;
  const hasGrotto = !!entries?.grotto;
  const hardscapeCount = Object.keys(hardscapes).filter(k=>hardscapes[k]!=null).length;
  const poolVolumeFt3 = len * wid * 4.25;
  const isLarge = poolVolumeFt3 > 3000;

  const phases = [
    { phase:"Week 1-2", icon:"📋", title:"Design, Permits & Planning", color:"#06b6d4",
      tasks:["Finalize pool design and sign contract","Submit permit application to local building dept","Engineering drawings completed (structural, electrical)","Utility locate (call 811 before any digging)","HOA approval if applicable"] },
    { phase:`Week 2-4${isLarge?" (extend 1 wk for large pools)":""}`, icon:"🚜", title:"Excavation & Steel", color:"#f59e0b",
      tasks:["Excavation: remove soil to pool depth + overdig","Steel rebar grid tied and inspected","Plumbing roughed in (main drains, returns, skimmers)","Steel/plumbing inspection — city inspector visits","Any retaining walls started now"] },
    { phase:"Week 4-5", icon:"💪", title:"Gunite / Shotcrete Shell", color:"#8b5cf6",
      tasks:["Gunite crew shoots concrete shell (4 inch thickness)","Shell cures 7-10 days (kept wet — critical step)","Grotto and infinity edge forms built during this phase",`Attached spa ${hasSpa?"shell poured simultaneously":""}`] },
    { phase:"Week 5-8", icon:"🔧", title:"Plumbing, Electrical & Equipment", color:"#22c55e",
      tasks:["Finish plumbing — all lines pressure tested","Equipment pad poured (pump, filter, heater location)","Electrical run — bonding, lighting conduit, panel work","Equipment installed: pump, filter, automation system","City electrical and plumbing inspection"] },
    { phase:`Week 6-9${hardscapeCount>3?" (longer with many hardscapes)":""}`, icon:"🏗️", title:"Deck & Hardscapes", color:"#d97706",
      tasks:["Concrete forms set for deck and coping","Coping installed (stone, tile, or concrete)","Deck poured and textured or pavers installed",hardscapeCount>0?"Hardscape features built (fire pit, pergola, kitchen, etc.)":"Optional hardscapes if included","Fencing installed around pool perimeter"] },
    { phase:"Week 9-10", icon:"✨", title:"Tile, Finish & Startup", color:"#ec4899",
      tasks:["Waterline tile installed","Interior finish applied (plaster, pebble, quartz, or tile)","Pool filled — takes 24-48 hrs typically","Startup chemistry balanced over 28-day cure","Equipment tested and programmed","Final city inspection and certificate of occupancy"] },
    { phase:"Week 10-11", icon:"🏊", title:"First Swim!", color:"#06b6d4",
      tasks:["Punch list walk-through with contractor","Homeowner orientation — equipment operation","Chemistry maintained at 2-week, 4-week intervals","Landscaping and site cleanup completed","Warranty documentation handed over"] },
  ];

  const totalWeeks = 10 + (isLarge?2:0) + (hardscapeCount>3?1:0) + (hasGrotto?1:0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.1),rgba(2,132,199,0.05))",border:"1px solid rgba(6,182,212,0.25)",borderRadius:14,padding:14}}>
        <div style={{fontSize:14,fontWeight:800,color:"#06b6d4",marginBottom:4}}>📅 Build Timeline</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>Estimated schedule based on your pool configuration. Timelines vary by contractor, permit speed, and weather.</div>
        <div style={{marginTop:10,display:"flex",gap:10,flexWrap:"wrap"}}>
          {[{label:"Total Build Time",val:`${totalWeeks}-${totalWeeks+2} weeks`},{label:"Pool Size",val:`${len}'×${wid}'`},{label:"Permit Time",val:"2-4 weeks"}].map(s=>(
            <div key={s.label} style={{background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</div>
              <div style={{fontSize:14,fontWeight:800,color:"#06b6d4"}}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {phases.map((p,i)=>(
        <div key={i} style={{background:"#111827",border:`1px solid #1e293b`,borderRadius:14,overflow:"hidden"}}>
          <div style={{background:`linear-gradient(135deg,${p.color}22,${p.color}11)`,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,borderLeft:`4px solid ${p.color}`}}>
            <span style={{fontSize:22}}>{p.icon}</span>
            <div>
              <div style={{fontSize:10,color:p.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{p.phase}</div>
              <div style={{fontSize:14,fontWeight:800,color:"#e2e8f0"}}>{p.title}</div>
            </div>
          </div>
          <div style={{padding:"10px 14px"}}>
            {p.tasks.filter(Boolean).map((task,j)=>(
              <div key={j} style={{display:"flex",gap:10,marginBottom:7,alignItems:"flex-start"}}>
                <span style={{color:p.color,fontSize:12,marginTop:1,flexShrink:0}}>→</span>
                <span style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{task}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:12,padding:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#f59e0b",marginBottom:6}}>⚠️ Common Delays to Plan For</div>
        {["Permits can take 2-8 weeks depending on your county","Rain stops gunite and concrete pours — plan for weather","Equipment supply chain: order Pentair gear before excavation","HOA approval can add 2-4 weeks if required","Inspector availability varies by city — schedule early"].map((d,i)=>(
          <div key={i} style={{fontSize:12,color:"#94a3b8",marginBottom:5,display:"flex",gap:8}}><span style={{color:"#f59e0b",flexShrink:0}}>•</span>{d}</div>
        ))}
      </div>
    </div>
  );
}

// ─── QUICK RENDER — Live photo capture + instant AI render ───────────────────
// Competes directly with Vip3D YARD: contractor takes a photo in client's
// backyard during the sales visit, renders the pool right there on the spot.
function QuickRender({ len, wid, shape, finishId, colorId, entries, hardscapes }) {
  const [photo, setPhoto] = useState(null);
  const [rendered, setRendered] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [style, setStyle] = useState("photorealistic");
  const [aiNote, setAiNote] = useState(null);
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef(null);

  const apiKey = import.meta.env.VITE_XAI_KEY ? import.meta.env.VITE_XAI_KEY : (() => { try { return localStorage.getItem("xai_dev_key") || ""; } catch { return ""; } })();
  const finishLabel = POOL_FINISHES.find(f => f.id === finishId)?.label || finishId;
  const colorLabel = POOL_COLORS.find(c => c.id === colorId)?.label || colorId;
  const shapeLabel = POOL_SHAPES.find(s => s.id === shape)?.label || shape;
  const activeFeatures = ENTRY_FEATURES.filter(e => entries[e.id]);
  const activeHardscapes = HARDSCAPE_OPTIONS.filter(h => hardscapes[h.id] != null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true); setError(null);
    } catch (e) {
      setError("Camera access denied. Please allow camera access in your browser settings, or upload a photo instead.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPhoto(dataUrl); stopCamera(); setRendered(null); setError(null);
  };

  const uploadPhoto = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Photo too large — keep under 8MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => { setPhoto(ev.target.result); setRendered(null); setError(null); };
    reader.readAsDataURL(file);
  };

  const renderNow = async () => {
    if (!photo) { setError("Take or upload a photo of the backyard first."); return; }
    if (!apiKey) { setError("Add your xAI API key in Settings to activate AI rendering."); return; }
    setRendering(true); setError(null); setProgress(5); setRendered(null); setAiNote(null);
    const steps = [[10,"Sending to Grok Aurora..."],[25,"Analyzing the space..."],[42,"Placing your pool..."],[58,"Rendering water & light..."],[74,"Matching shadows..."],[88,"Final polish..."]];
    let si = 0;
    const iv = setInterval(() => { if (si < steps.length) { setProgress(steps[si][0]); si++; } }, 3500);
    try {
      const featureList = activeFeatures.map(f => f.label).join(", ");
      const hardList = activeHardscapes.map(h => h.label).join(", ");
      const styleMap = {
        photorealistic: "natural daylight, ultra-photorealistic, correct perspective and shadows",
        twilight: "golden dusk lighting, warm sunset atmosphere, cinematic",
        night: "evening with LED pool lighting, dramatic night photography",
        magazine: "luxury architecture magazine, editorial lighting, aspirational",
      };
      let prompt = `Edit this backyard photo to add a realistic ${shapeLabel}-shaped swimming pool, ${len} feet by ${wid} feet wide, with ${colorLabel} water and ${finishLabel} interior finish.`;
      if (featureList) prompt += ` Include: ${featureList}.`;
      if (hardList) prompt += ` Also add: ${hardList}.`;
      prompt += ` The pool must look completely natural and permanently built here — correct perspective, realistic shadows, proper depth, real water reflections. ${styleMap[style]}. Ultra HD photorealistic result.`;

      const b64 = photo.split(",")[1];
      const mediaType = photo.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      const resp = await fetch("https://api.x.ai/v1/images/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "grok-imagine-image-quality", prompt, image: { b64_json: b64, media_type: mediaType }, response_format: "b64_json", n: 1 }),
      });
      clearInterval(iv);
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        if (resp.status === 401) throw new Error("Invalid API key — check Settings");
        if (resp.status === 429) throw new Error("Rate limit — wait 60 seconds");
        throw new Error(e?.error?.message || `Error ${resp.status}`);
      }
      const data = await resp.json();
      const b64r = data?.data?.[0]?.b64_json;
      if (!b64r) throw new Error("No image returned — please try again");
      setProgress(100); setRendered(`data:image/jpeg;base64,${b64r}`);
      // Get AI designer note
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 160,
          messages: [{ role: "user", content: `In 2 enthusiastic sentences, describe this pool design to an excited homeowner: ${len}x${wid} ${shapeLabel} pool, ${colorLabel} water, ${finishLabel} finish${featureList ? ", " + featureList : ""}.` }] })
      }).then(r => r.json()).then(d => setAiNote(d?.content?.[0]?.text || null)).catch(() => {});
    } catch (e) { clearInterval(iv); setError(e.message); }
    finally { setRendering(false); }
  };

  const STYLES = [
    { id: "photorealistic", label: "📷 Daylight" },
    { id: "twilight", label: "🌅 Twilight" },
    { id: "night", label: "🌙 Night" },
    { id: "magazine", label: "✨ Magazine" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,rgba(201,168,76,0.15),rgba(168,135,58,0.08))", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#c9a84c", marginBottom: 6 }}>⚡ Quick Render — Close the Deal On-Site</div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
          Stand in the client's backyard → tap the camera → show them their pool rendered into their real yard in under 60 seconds. No laptop needed. No site visit to schedule later. Close the deal right now.
        </div>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[`${len}'×${wid}' ${shapeLabel}`, colorLabel, finishLabel, ...activeFeatures.slice(0, 2).map(f => f.label)].map(tag => (
            <span key={tag} style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", color: "#c9a84c", fontSize: 11, fontWeight: 600 }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Camera / Photo */}
      {!photo ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
          {cameraActive ? (
            <div>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "cover", background: "#000" }} />
              <div style={{ padding: 12, display: "flex", gap: 8 }}>
                <button onClick={capturePhoto} style={{ flex: 2, padding: 14, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#c9a84c,#a8873a)", color: "#0a0f1e", fontWeight: 900, fontSize: 16, cursor: "pointer" }}>📸 Capture</button>
                <button onClick={stopCamera} style={{ flex: 1, padding: 14, borderRadius: 12, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 1.6 }}>Step 1 — Get a photo of the client's backyard</div>
              <button onClick={startCamera} style={{ padding: 16, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#c9a84c,#a8873a)", color: "#0a0f1e", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>📷 Open Camera — Take Live Photo</button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
                <span style={{ fontSize: 11, color: "#64748b" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
              </div>
              <label style={{ padding: 14, borderRadius: 12, border: "1px solid #334155", background: "#0f172a", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center", display: "block" }}>
                📁 Upload Existing Photo
                <input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} />
              </label>
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ position: "relative" }}>
            <img src={photo} alt="Backyard" style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }} />
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(201,168,76,0.9)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#0a0f1e" }}>✅ Photo Ready</div>
            <button onClick={() => { setPhoto(null); setRendered(null); setError(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "white", borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✕ Retake</button>
          </div>
        </div>
      )}

      {/* Style selector */}
      <div style={{ display: "flex", gap: 6 }}>
        {STYLES.map(s => (
          <button key={s.id} onClick={() => setStyle(s.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: `2px solid ${style === s.id ? "#c9a84c" : "#334155"}`, background: style === s.id ? "rgba(201,168,76,0.1)" : "#111827", color: style === s.id ? "#c9a84c" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{s.label}</button>
        ))}
      </div>

      {/* Render button */}
      {!rendering && !rendered && (
        <button onClick={renderNow} disabled={!photo} style={{ width: "100%", padding: 18, borderRadius: 14, border: "none", background: photo ? "linear-gradient(135deg,#7c3aed,#5b21b6)" : "#1e293b", color: "white", fontWeight: 900, fontSize: 17, cursor: photo ? "pointer" : "not-allowed", boxShadow: photo ? "0 4px 30px rgba(124,58,237,0.4)" : "none", letterSpacing: "0.02em" }}>
          🚀 Render Pool Into This Backyard
        </button>
      )}

      {/* Progress */}
      {rendering && (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 14, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>Grok Aurora is rendering your pool...</div>
          <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa,#c9a84c)", borderRadius: 3, transition: "width 3s ease" }} />
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>About 30-45 seconds — worth every one</div>
        </div>
      )}

      {/* Error */}
      {error && !rendering && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>⚠️ {error}</div>
          <button onClick={renderNow} style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Try Again</button>
        </div>
      )}

      {/* Result */}
      {rendered && !rendering && (
        <div style={{ background: "#111827", border: "2px solid rgba(201,168,76,0.4)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 40px rgba(201,168,76,0.15)" }}>
          <div style={{ position: "relative" }}>
            <img src={rendered} alt="Pool rendering" style={{ width: "100%", display: "block" }} />
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(201,168,76,0.95)", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 800, color: "#0a0f1e" }}>⚡ QUICK RENDER — Pool Craft Pro</div>
          </div>
          {aiNote && (
            <div style={{ padding: "14px 16px", background: "rgba(201,168,76,0.06)", borderTop: "1px solid rgba(201,168,76,0.15)" }}>
              <div style={{ fontSize: 10, color: "#c9a84c", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>🤖 AI Designer Note</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.65, fontStyle: "italic" }}>{aiNote}</div>
            </div>
          )}
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button onClick={() => { setRendered(null); setProgress(0); setTimeout(renderNow, 80); }} style={{ padding: 11, borderRadius: 10, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: "#a78bfa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🔄 New</button>
            <a href={rendered} download="poolcraft-quick-render.jpg" style={{ padding: 11, borderRadius: 10, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, fontSize: 12, textDecoration: "none", textAlign: "center", display: "block" }}>⬇️ Save</a>
            <button onClick={() => { if (navigator.share) navigator.share({ title: "Pool Design", text: "Your pool design from Pool Craft Pro", files: [] }); }} style={{ padding: 11, borderRadius: 10, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.1)", color: "#c9a84c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>📤 Share</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BUILD TRACKER — Post-sale phase tracking with client portal ──────────────
const BUILD_PHASES = [
  { id: "contract",    label: "Contract & Deposit",         icon: "📝", days: "Day 1",       detail: "Contract signed, deposit received, project activated" },
  { id: "design",      label: "Final Design Approval",      icon: "✅", days: "Days 1-7",    detail: "Client approves final pool design and selections" },
  { id: "permits",     label: "Permit Application",         icon: "🏛️", days: "Days 3-21",   detail: "Building permit submitted to local municipality" },
  { id: "permits_app", label: "Permits Approved",           icon: "✅", days: "Days 14-42",  detail: "All permits approved, ready to schedule excavation" },
  { id: "locate",      label: "Utility Locate (811)",       icon: "📍", days: "3 days before dig", detail: "All underground utilities marked before excavation" },
  { id: "excavation",  label: "Excavation",                 icon: "🚜", days: "1-2 days",    detail: "Pool excavated to engineered depth and dimensions" },
  { id: "steel",       label: "Steel & Plumbing Rough-In",  icon: "🔩", days: "2-3 days",    detail: "Rebar grid tied, main drain and plumbing roughed in" },
  { id: "inspection1", label: "Steel/Plumbing Inspection",  icon: "🔍", days: "1 day",       detail: "City inspector approves steel and plumbing" },
  { id: "gunite",      label: "Gunite / Shotcrete",         icon: "💪", days: "1-2 days",    detail: "Concrete shell shot and formed. Curing begins." },
  { id: "cure",        label: "Shell Curing",               icon: "⏰", days: "7-10 days",   detail: "Shell kept wet daily for proper curing — do not disturb" },
  { id: "equipment",   label: "Equipment Installation",     icon: "⚙️", days: "1-2 days",    detail: "Pump, filter, heater, automation installed on pad" },
  { id: "electrical",  label: "Electrical Rough-In",        icon: "⚡", days: "1-2 days",    detail: "All electrical run, bonding complete, lighting conduit" },
  { id: "inspection2", label: "Electrical Inspection",      icon: "🔍", days: "1 day",       detail: "City inspector approves electrical and bonding" },
  { id: "deck",        label: "Coping & Deck",              icon: "🏗️", days: "3-5 days",    detail: "Coping installed, deck formed and poured or paved" },
  { id: "tile",        label: "Waterline Tile",             icon: "🔷", days: "1-2 days",    detail: "Waterline tile installed and grouted" },
  { id: "plaster",     label: "Interior Finish",            icon: "✨", days: "1 day",       detail: "Pool interior plastered, pebbled, or tiled" },
  { id: "fill",        label: "Pool Fill",                  icon: "💧", days: "24-48 hrs",   detail: "Pool filled with water — do not stop mid-fill" },
  { id: "startup",     label: "Equipment Startup",          icon: "🔌", days: "1 day",       detail: "All equipment tested, chemistry balanced, startup complete" },
  { id: "final_insp",  label: "Final Inspection",           icon: "🏆", days: "1 day",       detail: "City final inspection and certificate of occupancy" },
  { id: "complete",    label: "Project Complete",           icon: "🎉", days: "",            detail: "Homeowner orientation complete. Enjoy your pool!" },
];

function BuildTracker({ projectName, clientName, clientEmail }) {
  const storageKey = `pc_build_${btoa(projectName || "default").slice(0, 20)}`;
  const [phases, setPhases] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey + "_notes") || "{}"); } catch { return {}; }
  });
  const [editingNote, setEditingNote] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [showClientView, setShowClientView] = useState(false);

  const togglePhase = (id) => {
    const updated = { ...phases, [id]: phases[id] ? null : { completedAt: new Date().toISOString(), by: "contractor" } };
    setPhases(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch {}
  };

  const saveNote = (id) => {
    const updated = { ...notes, [id]: noteInput.trim() };
    setNotes(updated); setEditingNote(null); setNoteInput("");
    try { localStorage.setItem(storageKey + "_notes", JSON.stringify(updated)); } catch {}
  };

  const completed = BUILD_PHASES.filter(p => phases[p.id]).length;
  const pct = Math.round((completed / BUILD_PHASES.length) * 100);
  const nextPhase = BUILD_PHASES.find(p => !phases[p.id]);
  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

  // Client-facing view
  if (showClientView) return (
    <div style={{ background: "#0a0f1e", minHeight: "100%", padding: 16, fontFamily: "Inter,system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowClientView(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: 20, cursor: "pointer" }}>←</button>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 900, fontSize: 14, letterSpacing: "1px" }}>
            <span style={{ color: "#e2e8f0" }}>POOL </span><span style={{ color: "#c9a84c" }}>CRAFT </span><span style={{ color: "#e2e8f0" }}>PRO</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>Client Progress View — {clientName || projectName}</div>
        </div>
      </div>
      <div style={{ background: "linear-gradient(135deg,#0f1e3d,#1a2f5e)", borderRadius: 16, padding: 20, marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: "#c9a84c", marginBottom: 4 }}>{pct}%</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 14 }}>Your pool is {pct}% complete</div>
        <div style={{ height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#c9a84c,#e8c96a)", borderRadius: 4, transition: "width 0.5s" }} />
        </div>
        {nextPhase && <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8" }}>Next: <strong style={{ color: "#c9a84c" }}>{nextPhase.label}</strong></div>}
      </div>
      {BUILD_PHASES.map(p => {
        const done = !!phases[p.id];
        const isCurrent = !done && p.id === nextPhase?.id;
        return (
          <div key={p.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12, opacity: done || isCurrent ? 1 : 0.4 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: done ? "linear-gradient(135deg,#c9a84c,#a8873a)" : isCurrent ? "rgba(201,168,76,0.2)" : "#1e293b", border: isCurrent ? "2px solid #c9a84c" : "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{done ? "✓" : p.icon}</div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: done ? 700 : 600, color: done ? "#c9a84c" : isCurrent ? "#e2e8f0" : "#64748b" }}>{p.label}</div>
              {done && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Completed {formatDate(phases[p.id]?.completedAt)}</div>}
              {isCurrent && <div style={{ fontSize: 11, color: "#c9a84c", marginTop: 2 }}>⚡ In Progress</div>}
              {notes[p.id] && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.5 }}>📝 {notes[p.id]}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,rgba(74,122,181,0.15),rgba(26,47,94,0.1))", border: "1px solid rgba(74,122,181,0.3)", borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#7ab0e8", marginBottom: 4 }}>🏗️ Build Tracker — {projectName}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, lineHeight: 1.6 }}>Track every construction phase and share real-time progress with your client. Reduces client anxiety, reduces calls, closes more referrals.</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>{completed} of {BUILD_PHASES.length} phases complete</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#c9a84c" }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#c9a84c,#e8c96a)", borderRadius: 4, transition: "width 0.4s" }} />
            </div>
          </div>
          <button onClick={() => setShowClientView(true)} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.1)", color: "#c9a84c", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>👤 Client View</button>
        </div>
        {clientEmail && <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>💡 Share the Client View link with {clientName || clientEmail} so they can check progress anytime</div>}
      </div>

      {/* Phase list */}
      {BUILD_PHASES.map((p, i) => {
        const done = !!phases[p.id];
        const isNext = !done && BUILD_PHASES.slice(0, i).every(prev => phases[prev.id]);
        return (
          <div key={p.id} style={{ background: "#111827", border: `1px solid ${done ? "rgba(201,168,76,0.3)" : isNext ? "rgba(74,122,181,0.3)" : "#1e293b"}`, borderRadius: 12, padding: 14, opacity: done || isNext ? 1 : 0.65 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <button onClick={() => togglePhase(p.id)} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${done ? "#c9a84c" : isNext ? "#7ab0e8" : "#334155"}`, background: done ? "rgba(201,168,76,0.15)" : "#1e293b", color: done ? "#c9a84c" : "#64748b", fontSize: 14, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done ? "✓" : p.icon}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: done ? "#c9a84c" : isNext ? "#7ab0e8" : "#94a3b8" }}>{p.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b", flexShrink: 0 }}>{p.days}</div>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>{p.detail}</div>
                {done && <div style={{ fontSize: 10, color: "#a8873a", marginTop: 4 }}>✓ Completed {formatDate(phases[p.id]?.completedAt)}</div>}
                {notes[p.id] && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, padding: "6px 10px", background: "#0f172a", borderRadius: 8 }}>📝 {notes[p.id]}</div>}
                {editingNote === p.id ? (
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    <input autoFocus value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveNote(p.id)} placeholder="Add a note for this phase..." style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
                    <button onClick={() => saveNote(p.id)} style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Save</button>
                    <button onClick={() => { setEditingNote(null); setNoteInput(""); }} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#64748b", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingNote(p.id); setNoteInput(notes[p.id] || ""); }} style={{ marginTop: 6, fontSize: 10, color: "#64748b", background: "none", border: "none", cursor: "pointer", padding: 0 }}>{notes[p.id] ? "✏️ Edit note" : "+ Add note"}</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
// ─── AUTH SYSTEM ─────────────────────────────────────────────────────────────
// Your Supabase credentials — customers never see these
// They are loaded from environment variables on Vercel
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const XAI_KEY = import.meta.env.VITE_XAI_KEY || "";
const GMAPS_KEY = import.meta.env.VITE_GMAPS_KEY || "";

// Auth state hook
function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { setAuthLoading(false); return; }
    loadSupabase().then(sb => {
      if (!sb) { setAuthLoading(false); return; }
      sb.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s); setUser(s?.user || null); setAuthLoading(false);
      });
      const { data: { subscription } } = sb.auth.onAuthStateChange((_e, s) => {
        setSession(s); setUser(s?.user || null);
      });
      return () => subscription?.unsubscribe();
    });
  }, []);

  const signOut = async () => {
    const sb = await loadSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null); setSession(null);
  };

  return { user, session, authLoading, signOut };
}

// Login / Signup Screen
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // If Supabase not configured, skip auth and go straight to app
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { onAuth({ id: "guest", email: "guest", guest: true }); }
  }, []);

  const handleSubmit = async () => {
    setError(null); setSuccess(null);
    if (!email.trim()) { setError("Email is required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const sb = await loadSupabase();
      if (!sb) throw new Error("Service unavailable — please try again");
      if (mode === "signup") {
        const { data, error: e } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } });
        if (e) throw e;
        if (data.user && !data.session) setSuccess("Check your email to confirm your account, then sign in.");
        else if (data.session) onAuth(data.user);
      } else if (mode === "login") {
        const { data, error: e } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
        onAuth(data.user);
      } else {
        const { error: e } = await sb.auth.resetPasswordForEmail(email.trim());
        if (e) throw e;
        setSuccess("Password reset link sent — check your email.");
      }
    } catch (e) {
      const msg = e.message || "Something went wrong";
      if (msg.includes("Invalid login")) setError("Incorrect email or password");
      else if (msg.includes("already registered")) setError("Account exists — try signing in");
      else setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0a0f1e,#0f1e3d)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Inter,system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
            <div style={{ width:64, height:64, borderRadius:16, background:"linear-gradient(135deg,#1a2f5e,#0f1e3d)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(201,168,76,0.4)", boxShadow:"0 4px 24px rgba(201,168,76,0.2)" }}>
              <svg viewBox="0 0 52 42" width="40" height="32">
                <defs>
                  <linearGradient id="aN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
                  <linearGradient id="aG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
                  <linearGradient id="aD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
                </defs>
                <text x="0" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#aN)">F</text>
                <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#aD)"/>
                <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
                <text x="30" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#aG)">P</text>
              </svg>
            </div>
          </div>
          <div style={{ fontSize:24, fontWeight:900, letterSpacing:"2px", fontFamily:"Georgia,serif" }}>
            <span style={{ color:"#e2e8f0" }}>POOL </span><span style={{ color:"#c9a84c" }}>CRAFT </span><span style={{ color:"#e2e8f0" }}>PRO</span>
          </div>
          <div style={{ fontSize:11, color:"#8a9ab5", letterSpacing:"2px", textTransform:"uppercase", marginTop:6 }}>Design Pools. Craft Outdoor Living.</div>
        </div>

        {/* Card */}
        <div style={{ background:"#111827", border:"1px solid #1e293b", borderRadius:20, padding:28, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#e2e8f0", marginBottom:4 }}>
            {mode==="login" ? "Sign In" : mode==="signup" ? "Create Account" : "Reset Password"}
          </div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>
            {mode==="login" ? "Welcome back — sign in to access your designs" : mode==="signup" ? "Start your free trial — no credit card needed" : "We'll send you a reset link"}
          </div>

          {mode==="signup" && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Full Name</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Email Address</div>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder="you@example.com" style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
          </div>

          {mode!=="reset" && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Password</div>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder={mode==="signup"?"Min 8 characters":"Your password"} style={{ width:"100%", background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"11px 14px", color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
          )}

          {error && <div style={{ marginBottom:14, padding:"10px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, fontSize:13, color:"#ef4444" }}>⚠️ {error}</div>}
          {success && <div style={{ marginBottom:14, padding:"10px 14px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:10, fontSize:13, color:"#22c55e" }}>✅ {success}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:loading?"#1e293b":`linear-gradient(135deg,#c9a84c,#a8873a)`, color:loading?"#64748b":"#0a0f1e", fontWeight:800, fontSize:15, cursor:loading?"not-allowed":"pointer" }}>
            {loading ? "Please wait..." : mode==="login" ? "Sign In" : mode==="signup" ? "Create Account" : "Send Reset Link"}
          </button>

          <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
            {mode==="login" && <button onClick={()=>{setMode("signup");setError(null);}} style={{ background:"none", border:"none", color:"#c9a84c", fontSize:13, cursor:"pointer" }}>Don't have an account? Sign up free</button>}
            {mode==="signup" && <button onClick={()=>{setMode("login");setError(null);}} style={{ background:"none", border:"none", color:"#c9a84c", fontSize:13, cursor:"pointer" }}>Already have an account? Sign in</button>}
            {mode==="login" && <button onClick={()=>{setMode("reset");setError(null);}} style={{ background:"none", border:"none", color:"#64748b", fontSize:12, cursor:"pointer" }}>Forgot password?</button>}
            {mode==="reset" && <button onClick={()=>{setMode("login");setError(null);}} style={{ background:"none", border:"none", color:"#64748b", fontSize:12, cursor:"pointer" }}>← Back to sign in</button>}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#334155" }}>
          By signing up you agree to our <a href="/privacy" style={{ color:"#64748b" }}>Privacy Policy</a> and <a href="/terms" style={{ color:"#64748b" }}>Terms of Service</a>
        </div>
      </div>
    </div>
  );
}

export default function PoolCraftPro() {
  const { user, session, authLoading, signOut } = useAuth();
  const [authedUser, setAuthedUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [shape, setShape] = useState("rectangle");
  const [len, setLen] = useState(30);
  const [wid, setWid] = useState(15);
  const [depthId, setDepthId] = useState("standard");
  const [finishId, setFinishId] = useState("pebble");
  const [colorId, setColorId] = useState("caribbean");
  const [entries, setEntries] = useState({});
  const [hardscapes, setHardscapes] = useState({});
  const [extras, setExtras] = useState({ heater:true, sanitization:"salt", waterFeature:false });
  const [shopCat, setShopCat] = useState("tile");
  const [wishlist, setWishlist] = useState([]);
  const [guideMode, setGuideMode] = useState("contractor");
  const [bgPhoto, setBgPhoto] = useState(null);
  const [address, setAddress] = useState("");
  const [parcelStatus, setParcelStatus] = useState(null);
  const [parcelData, setParcelData] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [localRates, setLocalRates] = useState({ multiplier:1, laborMultiplier:1 });

  const [dailyRenders, setDailyRenders] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("pc_daily")||"{}"); const today = new Date().toDateString(); return saved.date === today ? (saved.count||0) : 0; } catch { return 0; }
  });

  const DAILY_RENDER_LIMIT = 10;
  const apiKey = XAI_KEY || (() => { try { return localStorage.getItem("xai_dev_key")||""; } catch { return ""; } })();

  const bumpDailyRender = () => {
    const newCount = dailyRenders + 1; setDailyRenders(newCount);
    try { localStorage.setItem("pc_daily", JSON.stringify({ date: new Date().toDateString(), count: newCount })); } catch {}
    return newCount;
  };

  const [showOnboarding, setShowOnboarding] = useState(() => { try { return !localStorage.getItem("pc_onboarded"); } catch { return true; } });
  const [userMode, setUserMode] = useState(() => { try { return localStorage.getItem("pc_mode")||"contractor"; } catch { return "contractor"; } });
  const [showProjects, setShowProjects] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("My Pool Project");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState("");
  const [saveClientInput, setSaveClientInput] = useState("");
  const [saveClientEmailInput, setSaveClientEmailInput] = useState("");
  const [saveClientPhoneInput, setSaveClientPhoneInput] = useState("");
  const [saveShowContactFields, setSaveShowContactFields] = useState(false);
  const [clientName, setClientName] = useState(null);
  const [clientEmail, setClientEmail] = useState(null);
  const [clientPhone, setClientPhone] = useState(null);
  const [savedToast, setSavedToast] = useState(false);
  const [savedToastMsg, setSavedToastMsg] = useState("✅ Project saved!");
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const [showSplash, setShowSplash] = useState(() => { try { return !localStorage.getItem("pc_launched"); } catch { return true; } });
  const [showShare, setShowShare] = useState(false);
  const [unsavedConfirm, setUnsavedConfirm] = useState(null);

  // Demo mode — loads a sample pool so contractors can show the app during sales visits
  const activateDemo = () => {
    setShape("freeform"); setLen(40); setWid(20); setDepthId("standard");
    setFinishId("pebble"); setColorId("caribbean");
    setEntries({ beach_entry: true, baja_shelf: true, spa_attached: true });
    setHardscapes({ fire_pit: 1, outdoor_kitchen: 1, pergola: 1 });
    setExtras({ heater: true, sanitization: "salt", waterFeature: true });
    setProjectName("Demo — Lagoon Pool"); setClientName("Sample Client");
    setClientEmail("client@example.com");
    setDemoMode(true); setTab(0);
    try { localStorage.setItem("pc_mode","contractor"); } catch {}
  };
  const exitDemo = () => {
    setShape("rectangle"); setLen(30); setWid(15); setDepthId("standard");
    setFinishId("pebble"); setColorId("caribbean");
    setEntries({}); setHardscapes({}); setExtras({ heater:true, sanitization:"salt", waterFeature:false });
    setProjectName("My Pool Project"); setClientName(null); setClientEmail(null);
    setDemoMode(false);
  };

  // ── Unsaved changes tracking ──
  // Snapshot the design-relevant fields right after a save or load; compare
  // against current state to know whether navigating away would lose work.
  const lastSavedSnapshot = useRef(null);
  const designSnapshot = useMemo(() => JSON.stringify({
    shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, address, localRates,
    clientName, clientEmail, clientPhone, projectName,
  }), [shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, address, localRates, clientName, clientEmail, clientPhone, projectName]);
  const isDirty = lastSavedSnapshot.current !== null && lastSavedSnapshot.current !== designSnapshot;
  const markSnapshotClean = () => { lastSavedSnapshot.current = designSnapshot; };
  useEffect(() => { if (lastSavedSnapshot.current === null) markSnapshotClean(); }, []); // eslint-disable-line
  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; return ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
  const materials = useMemo(()=>calcMaterials(shape,len,wid,depthId,finishId),[shape,len,wid,depthId,finishId]);
  const equipment = useMemo(()=>getPentairEquipment(materials.gallons,extras),[materials.gallons,extras]);

  // Show login screen until authenticated
  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:"#0a0f1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:20, fontWeight:900, letterSpacing:"2px", color:"#c9a84c", marginBottom:16 }}>POOL CRAFT PRO</div>
        <div style={{ color:"#64748b", fontSize:13 }}>Loading...</div>
      </div>
    </div>
  );

  if (!user && !authedUser && SUPABASE_URL) return <AuthScreen onAuth={u => setAuthedUser(u)} />;

  const currentUser = user || authedUser || { id: "local", email: "user@local", guest: true };

  // Run `action` immediately if there's nothing to lose, otherwise ask first
  const withUnsavedCheck = (action) => { if (isDirty) setUnsavedConfirm(() => action); else action(); };

  const completeSplash = () => { try { localStorage.setItem("pc_launched","1"); } catch {} setShowSplash(false); };
  const completeOnboarding = () => { try { localStorage.setItem("pc_onboarded","1"); localStorage.setItem("pc_mode", userMode); } catch {} setShowOnboarding(false); };

  const saveProject = async () => {
    const name = saveNameInput.trim() || projectName;
    const id = projectId || Date.now();
    setSavingInProgress(true);
    const project = {
      id, name, savedAt: Date.now(),
      clientName: saveClientInput.trim() || clientName || null,
      clientEmail: saveClientEmailInput.trim() || clientEmail || null,
      clientPhone: saveClientPhoneInput.trim() || clientPhone || null,
      shape, len, wid, depthId, finishId, colorId, entries, hardscapes, extras, address, localRates,
      gallons: materials.gallons,
      entryCount: Object.keys(entries).length,
      hardscapeCount: Object.keys(hardscapes).filter(k=>hardscapes[k]!=null).length,
      finish: POOL_FINISHES.find(f=>f.id===finishId)?.label || finishId,
    };
    const savedToCloud = await saveProjectRecord(project);
    setSavingInProgress(false);
    setProjectId(id);
    setProjectName(name);
    setClientName(project.clientName);
    setClientEmail(project.clientEmail);
    setClientPhone(project.clientPhone);
    setShowSaveDialog(false); setSaveNameInput(""); setSaveClientInput(""); setSaveClientEmailInput(""); setSaveClientPhoneInput("");
    const cloudConfigured = !!(getSupabaseConfig().url && getSupabaseConfig().key);
    setSavedToastMsg(cloudConfigured && !savedToCloud ? "✅ Saved to this device (cloud sync had an issue)" : cloudConfigured ? "✅ Saved & synced to the cloud" : "✅ Project saved!");
    setSavedToast(true); setTimeout(()=>setSavedToast(false), 2800);
    markSnapshotClean();
  };

  const loadProject = (p) => {
    setProjectId(p.id);
    setClientEmail(p.clientEmail||null);
    setClientPhone(p.clientPhone||null);
    setClientName(p.clientName||null);
    setShape(p.shape||"rectangle"); setLen(p.len||30); setWid(p.wid||15);
    setDepthId(p.depthId||"standard"); setFinishId(p.finishId||"pebble"); setColorId(p.colorId||"caribbean");
    setEntries(p.entries||{}); setHardscapes(p.hardscapes||{});
    setExtras(p.extras||{heater:true,sanitization:"salt",waterFeature:false});
    setLocalRates(p.localRates||{multiplier:1,laborMultiplier:1});
    setAddress(p.address||""); setProjectName(p.name||"My Pool Project");
    setShowProjects(false); setTab(0);
    setTimeout(markSnapshotClean, 0);
  };

  const startNewProject = () => {
    setProjectId(null); setProjectName("New Pool Project"); setClientName(null); setClientEmail(null); setClientPhone(null);
    setShape("rectangle"); setLen(30); setWid(15); setDepthId("standard");
    setFinishId("pebble"); setColorId("caribbean"); setEntries({}); setHardscapes({});
    setExtras({heater:true,sanitization:"salt",waterFeature:false});
    setLocalRates({multiplier:1,laborMultiplier:1});
    setAddress(""); setParcelData(null); setParcelStatus(null); setShowMap(false);
    setBgPhoto(null); setTab(0);
    setTimeout(markSnapshotClean, 0);
  };

  const exportPDF = () => generatePDF({ projectName, shape, len, wid, depthId, finishId, colorId, materials, equipment, entries, hardscapes, parcelData });

  const toggleEntry = (id) => setEntries(p => p[id] ? (({[id]:_,...r})=>r)(p) : {...p,[id]:true});
  const toggleHardscape = (id) => setHardscapes(p => p[id]!=null ? (({[id]:_,...r})=>r)(p) : {...p,[id]:100});
  const setHSQty = (id, v) => setHardscapes(p => { const n = Number(v); const safe = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0; return {...p,[id]:safe}; });
  const toggleWishlist = (name) => setWishlist(p => p.includes(name)?p.filter(x=>x!==name):[...p,name]);

  const poolColor = POOL_COLORS.find(c=>c.id===colorId)||POOL_COLORS[1];
  const activeCat = SHOP_CATEGORIES.find(c=>c.id===shopCat);
  const activeEntries = ENTRY_FEATURES.filter(e=>entries[e.id]);

  const lookupAddress = async () => {
    if (!address.trim()) return;
    setParcelStatus("loading"); setParcelData(null); setShowMap(false);
    try { const data = await lookupParcel(address); setParcelData(data); setParcelStatus("found"); setShowMap(true); }
    catch(err) { setParcelStatus("error"); }
  };

  const card = {background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:18};
  const sectionTitle = {fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12};
  const chip = (active,color="#06b6d4")=>({padding:"8px 14px",borderRadius:20,border:`2px solid ${active?color:"#334155"}`,background:active?`${color}22`:"#1e293b",color:active?color:"#94a3b8",cursor:"pointer",fontSize:12,fontWeight:600,transition:"all 0.15s"});

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#0b1120",minHeight:"100vh",color:"#e2e8f0"}}>
      {showSplash && <SplashScreen onDone={completeSplash} />}
      {showShare && <ShareDesign projectName={projectName} clientName={clientName} clientEmail={clientEmail} clientPhone={clientPhone} shape={shape} len={len} wid={wid} depthId={depthId} finishId={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} materials={materials} onClose={()=>setShowShare(false)} />}
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} userMode={userMode} setUserMode={setUserMode} setLen={setLen} setWid={setWid} setShape={setShape} setDepthId={setDepthId} setFinishId={setFinishId} />}
      {showProjects && <ProjectManager currentProjectId={projectId} onLoad={(p)=>withUnsavedCheck(()=>loadProject(p))} onClose={()=>setShowProjects(false)} />}

      {showSaveDialog && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:24,width:"100%",maxWidth:380}}>
            <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0",marginBottom:16}}>💾 {projectId?"Update":"Save"} Project</div>
            <input value={saveNameInput} onChange={e=>setSaveNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()}
              placeholder="Project name e.g. Smith Residence Pool"
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10}} />
            <input value={saveClientInput} onChange={e=>setSaveClientInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()}
              placeholder="Client name (optional) e.g. John & Mary Smith"
              style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:saveShowContactFields?10:12}} />
            {saveShowContactFields ? (
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                <input type="email" value={saveClientEmailInput} onChange={e=>setSaveClientEmailInput(e.target.value)} placeholder="Client email (optional)"
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} />
                <input type="tel" value={saveClientPhoneInput} onChange={e=>setSaveClientPhoneInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveProject()} placeholder="Client phone (optional)"
                  style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",color:"#e2e8f0",fontSize:13,outline:"none",boxSizing:"border-box"}} />
              </div>
            ) : (
              <button onClick={()=>setSaveShowContactFields(true)} style={{background:"none",border:"none",color:"#06b6d4",fontSize:11,fontWeight:600,cursor:"pointer",padding:0,marginBottom:12}}>+ Add client email or phone (lets you share designs directly)</button>
            )}
            <div style={{fontSize:11,color:"#64748b",marginBottom:14}}>{len}'x{wid}' {POOL_SHAPES.find(s=>s.id===shape)?.label} - {materials.gallons.toLocaleString()} gal - {Object.keys(entries).length} features</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowSaveDialog(false)} style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveProject} disabled={savingInProgress} style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:800,fontSize:13,cursor:savingInProgress?"not-allowed":"pointer",opacity:savingInProgress?0.7:1}}>{savingInProgress?"Saving...":"Save Project"}</button>
            </div>
          </div>
        </div>
      )}

      {savedToast && (<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"rgba(34,197,94,0.95)",borderRadius:20,padding:"10px 20px",fontSize:13,fontWeight:700,color:"white",zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",whiteSpace:"nowrap"}}>{savedToastMsg}</div>)}

      {unsavedConfirm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:24,width:"100%",maxWidth:380}}>
            <div style={{fontSize:32,marginBottom:10}}>⚠️</div>
            <div style={{fontSize:15,fontWeight:800,color:"#e2e8f0",marginBottom:8}}>You have unsaved changes</div>
            <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6,marginBottom:18}}>{projectName} has edits that haven't been saved yet. If you continue, those changes will be lost.</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={async ()=>{ const action=unsavedConfirm; setUnsavedConfirm(null); await saveProject(); if(action) action(); }}
                style={{padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"white",fontWeight:800,fontSize:13,cursor:"pointer"}}>💾 Save, Then Continue</button>
              <button onClick={()=>{ const action=unsavedConfirm; setUnsavedConfirm(null); if(action) action(); }}
                style={{padding:"12px",borderRadius:10,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.12)",color:"#ef4444",fontWeight:700,fontSize:13,cursor:"pointer"}}>Discard Changes & Continue</button>
              <button onClick={()=>setUnsavedConfirm(null)} style={{padding:"12px",borderRadius:10,border:"1px solid #334155",background:"#1e293b",color:"#94a3b8",fontWeight:700,fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{background:"linear-gradient(135deg,#0a0f1e 0%,#0f1e3d 60%,#0a0f1e 100%)",padding:"14px 16px 0",borderBottom:"1px solid rgba(201,168,76,0.2)"}}>
        {/* Row 1: logo mark + wordmark + mode badge */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#1a2f5e,#0f1e3d)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid rgba(201,168,76,0.35)",boxShadow:"0 2px 12px rgba(201,168,76,0.15)"}}>
            <svg viewBox="0 0 52 42" width="30" height="24">
              <defs>
                <linearGradient id="hN" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4a7ab5"/><stop offset="100%" stopColor="#1a2f5e"/></linearGradient>
                <linearGradient id="hG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#e8c96a"/><stop offset="100%" stopColor="#a8873a"/></linearGradient>
                <linearGradient id="hD" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6aaee8"/><stop offset="100%" stopColor="#1a5fa8"/></linearGradient>
              </defs>
              <text x="0" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#hN)">F</text>
              <path d="M 26 1 C 26 1,18 14,18 20 C 18 26 21.5 30 26 30 C 30.5 30 34 26 34 20 C 34 14 26 1 26 1 Z" fill="url(#hD)"/>
              <ellipse cx="23" cy="15" rx="2.5" ry="4" fill="white" opacity="0.4" transform="rotate(-15 23 15)"/>
              <text x="30" y="34" fontFamily="Georgia,serif" fontWeight="700" fontSize="34" fill="url(#hG)">P</text>
            </svg>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:15,letterSpacing:"1.5px",fontFamily:"Georgia,serif",lineHeight:1.1}}>
              <span style={{color:"#dde6f0"}}>POOL </span><span style={{color:"#c9a84c"}}>CRAFT </span><span style={{color:"#dde6f0"}}>PRO</span>
            </div>
            <div style={{fontSize:11,color:"#8a9ab5",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginTop:2}}>
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{clientName?`${clientName} · `:""}{projectName}</span>
              {(!projectId || isDirty) && (
                <span style={{display:"inline-flex",alignItems:"center",gap:3,color:"#c9a84c",fontWeight:700,flexShrink:0}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:"#c9a84c"}}></span>
                  {!projectId ? "unsaved" : "unsaved changes"}
                </span>
              )}
            </div>
          </div>
          <div onClick={()=>setShowOnboarding(true)} style={{padding:"6px 10px",borderRadius:16,background:userMode==="homeowner"?"rgba(34,197,94,0.15)":userMode==="designer"?"rgba(201,168,76,0.15)":"rgba(74,122,181,0.2)",border:`1px solid ${userMode==="homeowner"?"rgba(34,197,94,0.3)":userMode==="designer"?"rgba(201,168,76,0.35)":"rgba(74,122,181,0.4)"}`,fontSize:10,color:userMode==="homeowner"?"#22c55e":userMode==="designer"?"#c9a84c":"#7ab0e8",fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
            {userMode==="homeowner"?"🏠 HO":userMode==="designer"?"🎨 Design":"👷 Pro"}
          </div>
          {currentUser && !currentUser.guest && (
            <button onClick={signOut} style={{padding:"6px 10px",borderRadius:16,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>Sign Out</button>
          )}
        </div>
        {/* Demo mode banner */}
        {demoMode && (
          <div style={{background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.4)",borderRadius:10,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>🎯 Demo Mode — Showing sample lagoon pool to client</div>
            <button onClick={exitDemo} style={{padding:"4px 12px",borderRadius:10,background:"rgba(245,158,11,0.2)",border:"1px solid rgba(245,158,11,0.4)",color:"#f59e0b",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Exit Demo</button>
          </div>
        )}
        {/* Row 2: action buttons */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          <button onClick={()=>withUnsavedCheck(startNewProject)} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",color:"#c9a84c",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>➕ New</button>
          <button onClick={()=>{setSaveNameInput(projectName);setSaveClientInput(clientName||"");setSaveClientEmailInput(clientEmail||"");setSaveClientPhoneInput(clientPhone||"");setSaveShowContactFields(!!(clientEmail||clientPhone));setShowSaveDialog(true);}} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>💾 Save</button>
          <button onClick={()=>setShowProjects(true)} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(74,122,181,0.12)",border:"1px solid rgba(74,122,181,0.3)",color:"#7ab0e8",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>📂 Projects</button>
          <button onClick={exportPDF} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.25)",color:"#c9a84c",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>📄 PDF</button>
          <button onClick={()=>setShowShare(true)} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.25)",color:"#a78bfa",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>📤 Share</button>
          {!demoMode && <button onClick={activateDemo} style={{padding:"7px 12px",minHeight:34,borderRadius:16,background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",color:"#f59e0b",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>🎯 Demo</button>}
          {wishlist.length>0&&<div style={{padding:"7px 10px",minHeight:34,display:"flex",alignItems:"center",borderRadius:16,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",fontSize:12,color:"#c9a84c",flexShrink:0}}>❤️ {wishlist.length}</div>}
        </div>
        {/* Row 3: tab navigation */}
        <div style={{display:"flex",overflowX:"auto",gap:2}}>
          {NAV_TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{whiteSpace:"nowrap",padding:"12px 12px",minHeight:44,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",borderRadius:"8px 8px 0 0",background:tab===t.id?"#060a14":"transparent",color:tab===t.id?"#c9a84c":"#5a6a80",borderBottom:tab===t.id?"2px solid #c9a84c":"2px solid transparent"}}>{t.icon} {t.label}</button>))}
        </div>
      </div>

      <div style={{padding:"16px 14px",maxWidth:820,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>

        {tab===0&&<>
          <div style={card}>
            <div style={sectionTitle}>Pool Shape</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{POOL_SHAPES.map(s=><button key={s.id} onClick={()=>setShape(s.id)} style={chip(shape===s.id)}>{s.icon} {s.label}</button>)}</div>
            <div style={{marginTop:10,fontSize:12,color:"#64748b"}}>💡 {POOL_SHAPES.find(s=>s.id===shape)?.desc}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[{label:"Length (ft)",val:len,set:setLen,min:10,max:120},{label:"Width (ft)",val:wid,set:setWid,min:8,max:60}].map(f=>{
              const clamp = (raw) => {
                if (raw === "" || raw === "-") return null; // let them keep typing
                const n = Number(raw);
                if (!Number.isFinite(n)) return f.val;
                return Math.round(n);
              };
              const handleChange = (e) => {
                const result = clamp(e.target.value);
                if (result !== null) f.set(result);
              };
              const handleBlur = (e) => {
                const n = Number(e.target.value);
                if (e.target.value === "" || !Number.isFinite(n)) { f.set(f.min); return; }
                f.set(Math.max(f.min, Math.min(f.max, Math.round(n))));
              };
              const outOfRange = f.val < f.min || f.val > f.max;
              return (
                <div key={f.label} style={card}>
                  <div style={{...sectionTitle,marginBottom:8}}>{f.label}</div>
                  <input type="number" inputMode="numeric" value={f.val} min={f.min} max={f.max} onChange={handleChange} onBlur={handleBlur}
                    style={{width:"100%",background:"#1e293b",border:`1px solid ${outOfRange?"#ef4444":"#334155"}`,borderRadius:10,padding:"10px 12px",color:outOfRange?"#ef4444":"#06b6d4",fontSize:20,fontWeight:800,outline:"none",boxSizing:"border-box"}}/>
                  <input type="range" min={f.min} max={f.max} value={Math.max(f.min,Math.min(f.max,f.val))} onChange={handleChange} style={{width:"100%",marginTop:8,accentColor:"#c9a84c"}}/>
                  {outOfRange && <div style={{fontSize:11,color:"#ef4444",marginTop:6}}>Valid range is {f.min}-{f.max} ft - will snap back when you tap away</div>}
                </div>
              );
            })}
          </div>
          <div style={card}>
            <div style={sectionTitle}>Depth Profile</div>
            {DEPTHS.map(d=>(<button key={d.id} onClick={()=>setDepthId(d.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"11px 14px",marginBottom:6,borderRadius:10,border:`2px solid ${depthId===d.id?"#06b6d4":"#334155"}`,background:depthId===d.id?"rgba(6,182,212,0.08)":"#1e293b",color:depthId===d.id?"#e2e8f0":"#94a3b8",cursor:"pointer"}}><div style={{fontWeight:700,fontSize:13}}>{depthId===d.id?"✓ ":""}{d.label}</div><div style={{fontSize:11,color:"#64748b",marginTop:3}}>{d.desc}</div></button>))}
          </div>
          <div style={card}>
            <div style={sectionTitle}>Interior Finish</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{POOL_FINISHES.map(f=><button key={f.id} onClick={()=>setFinishId(f.id)} style={chip(finishId===f.id)}>{f.label}</button>)}</div>
            <div style={{marginTop:10,fontSize:12,color:"#64748b"}}>💡 {POOL_FINISHES.find(f=>f.id===finishId)?.desc}</div>
          </div>
          <div style={card}>
            <div style={sectionTitle}>Water Color</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>{POOL_COLORS.map(c=>(<button key={c.id} onClick={()=>setColorId(c.id)} style={{padding:"6px 12px",borderRadius:20,border:`2px solid ${colorId===c.id?"#fff":"#334155"}`,background:c.hex,color:["#e8f4f8","#d4a76a"].includes(c.hex)?"#1e293b":"#fff",cursor:"pointer",fontSize:12,fontWeight:700,opacity:colorId===c.id?1:0.65,transition:"all 0.15s"}}>{c.label}</button>))}</div>
          </div>

          <div style={card}>
            <div style={sectionTitle}>🧊 3D Preview</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>An instant 3D model from your dimensions, shape, depth, and finish — no photo needed. Rotate it to check proportions before generating an AI rendering below.</div>
            <Pool3D poolLen={len} poolWid={wid} poolShape={shape} poolColor={poolColor.hex} depthId={depthId} entries={entries} finishId={finishId} />
          </div>

          <div style={card}>
            <div style={sectionTitle}>✨ AI Pool Rendering</div>
            <AIRenderingPanel bgPhoto={bgPhoto} setBgPhoto={setBgPhoto} shape={shape} poolColor={poolColor.hex} len={len} wid={wid} finish={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} dailyRenders={dailyRenders} dailyLimit={DAILY_RENDER_LIMIT} onRenderComplete={bumpDailyRender} />
          </div>

          <div style={card}>
            <div style={sectionTitle}>📍 Property Lookup & Pool Placement</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:10}}>Enter an address to pull parcel data, then drag the pool to its correct position for permit planning.</div>
            <div style={{display:"flex",gap:8}}>
              <input type="text" placeholder="123 Main St, City, State" value={address} onChange={e=>setAddress(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookupAddress()} style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"10px 14px",color:"#e2e8f0",fontSize:14,outline:"none"}}/>
              <button onClick={lookupAddress} disabled={parcelStatus==="loading"} style={{padding:"10px 16px",borderRadius:10,background:"linear-gradient(135deg,#06b6d4,#0284c7)",border:"none",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,opacity:parcelStatus==="loading"?0.6:1}}>{parcelStatus==="loading"?"⏳":"Search"}</button>
            </div>
            {parcelStatus==="found"&&parcelData&&<>
              <div style={{marginTop:12,background:"rgba(6,182,212,0.08)",border:"1px solid rgba(6,182,212,0.2)",borderRadius:12,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,color:"#06b6d4",fontWeight:700}}>✅ Parcel Found - {parcelData.address}</div>
                  <div style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:parcelData.source==="regrid"?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",border:`1px solid ${parcelData.source==="regrid"?"rgba(34,197,94,0.3)":"rgba(245,158,11,0.3)"}`,color:parcelData.source==="regrid"?"#22c55e":"#f59e0b",fontWeight:700}}>{parcelData.source==="regrid"?"🟢 Live Regrid Data":"🟡 Estimated"}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{label:"Parcel / APN",val:parcelData.parcel},{label:"Lot Size",val:parcelData.lot_size},{label:"Lot Sq Ft",val:parcelData.lot_sqft},{label:"Zoning",val:parcelData.zoning},{label:"Front Setback",val:parcelData.setback_front},{label:"Rear Setback",val:parcelData.setback_rear},{label:"Side Setback",val:parcelData.setback_side},{label:"Pool Setback",val:parcelData.pool_setback}].map(r=>(
                    <div key={r.label} style={{background:"#1e293b",borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em"}}>{r.label}</div><div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginTop:2}}>{r.val}</div></div>
                  ))}
                </div>
              </div>
              {showMap&&<div style={{marginTop:14}}>
                <div style={{fontSize:11,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>🗺️ Interactive Property Map - Drag Pool to Place</div>
                <PropertyMap poolLen={len} poolWid={wid} poolShape={shape} poolColor={poolColor.hex} parcelData={parcelData}/>
                <div style={{marginTop:10,padding:"8px 12px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,fontSize:12,color:"#f59e0b"}}>⚠️ Setback data shown is for planning reference. Always verify with your local building department before permit submission.</div>
              </div>}
            </>}
          </div>

          <div style={card}>
            <div style={sectionTitle}>☁️ Cloud Sync</div>
            <CloudSyncPanel />
          </div>
        </>}

        {tab===1&&<>
          <div style={{fontSize:13,color:"#94a3b8",padding:"4px 0 8px"}}>Tap any feature to learn more and add it to your pool design.</div>
          {ENTRY_FEATURES.map(ef=>(<FeatureCard key={ef.id} feature={ef} active={!!entries[ef.id]} onToggle={()=>toggleEntry(ef.id)} />))}
          {Object.keys(entries).length > 0 && (
            <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.1),rgba(2,132,199,0.06))",border:"1px solid rgba(6,182,212,0.25)",borderRadius:12,padding:14,marginTop:4}}>
              <div style={{fontSize:12,color:"#06b6d4",fontWeight:700,marginBottom:8}}>✅ Selected Features ({Object.keys(entries).length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{ENTRY_FEATURES.filter(e=>entries[e.id]).map(e=>(<span key={e.id} style={{padding:"5px 12px",borderRadius:20,background:`${e.color}22`,border:`1px solid ${e.color}55`,color:e.color,fontSize:12,fontWeight:600}}>{e.icon} {e.label}</span>))}</div>
            </div>
          )}
        </>}

        {tab===2&&<HardscapeDesigner hardscapes={hardscapes} toggleHardscape={toggleHardscape} setHSQty={setHSQty} dailyRenders={dailyRenders} dailyLimit={DAILY_RENDER_LIMIT} bumpDailyRender={bumpDailyRender} apiKey={apiKey} />}

        {tab===3&&<YardPlanner poolLen={len} poolWid={wid} poolShape={shape} poolColor={poolColor.hex} entries={entries} hardscapes={hardscapes} parcelData={parcelData} />}

        {tab===4&&<>
          <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.15),rgba(2,132,199,0.1))",border:"1px solid rgba(6,182,212,0.3)",borderRadius:14,padding:16}}>
            <div style={{fontSize:12,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>Pool Summary</div>
            <div style={{fontSize:15,fontWeight:700,color:"#e2e8f0",marginTop:4}}>{POOL_SHAPES.find(s=>s.id===shape)?.label} - {len}' x {wid}'</div>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:3}}>{materials.gallons.toLocaleString()} gallons - {POOL_FINISHES.find(f=>f.id===finishId)?.label}</div>
          </div>
          {[{label:"Excavation",val:materials.excavation,note:"Includes 20% over-dig"},{label:"Gunite / Shotcrete",val:materials.gunite,note:"4 inch shell thickness"},{label:"Rebar",val:materials.rebar,note:"#3 rebar - 20 ft sticks - 12 inch on center grid - includes 15% lap splice"},{label:"Gravel Base",val:materials.gravel,note:"3/4 inch crushed stone 4 inch bed"},{label:"PVC Plumbing",val:materials.plumbing,note:"2 inch & 3 inch schedule 40"},{label:"Coping",val:materials.coping,note:"Bond beam perimeter"},{label:"Waterline Tile",val:materials.tile,note:"6 inch tile band"},{label:"Interior Finish",val:materials.finish,note:POOL_FINISHES.find(f=>f.id===finishId)?.label}].map(row=>(
            <div key={row.label} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:12,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:600,fontSize:14}}>{row.label}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{row.note}</div></div>
              <div style={{fontWeight:800,fontSize:16,color:"#06b6d4"}}>{row.val}</div>
            </div>
          ))}
        </>}

        {tab===5&&<CostEstimator shape={shape} len={len} wid={wid} depthId={depthId} finishId={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} extras={extras} localRates={localRates} setLocalRates={setLocalRates} projectName={projectName} clientName={clientName} materials={materials} />}

        {tab===6&&<>
          <div style={card}>
            <div style={sectionTitle}>Equipment Options</div>
            {[{label:"🔥 Include Heater",key:"heater"},{label:"💧 Water Features",key:"waterFeature"}].map(o=>(
              <div key={o.key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <span style={{fontSize:14}}>{o.label}</span>
                <button onClick={()=>setExtras(p=>({...p,[o.key]:!p[o.key]}))} style={{width:44,height:24,borderRadius:12,border:"none",cursor:"pointer",background:extras[o.key]?"#06b6d4":"#334155",position:"relative",transition:"background 0.2s",flexShrink:0}}><span style={{position:"absolute",top:3,left:extras[o.key]?22:3,width:18,height:18,borderRadius:"50%",background:"white",transition:"left 0.2s"}}/></button>
              </div>
            ))}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:14}}>🧂 Sanitization</span>
              <div style={{display:"flex",gap:6}}>{["salt","chlorine"].map(sv=>(<button key={sv} onClick={()=>setExtras(p=>({...p,sanitization:sv}))} style={{padding:"5px 12px",borderRadius:8,border:`2px solid ${extras.sanitization===sv?"#06b6d4":"#334155"}`,background:extras.sanitization===sv?"rgba(6,182,212,0.1)":"#1e293b",color:extras.sanitization===sv?"#06b6d4":"#94a3b8",cursor:"pointer",fontSize:12,fontWeight:700,textTransform:"capitalize"}}>{sv}</button>))}</div>
            </div>
          </div>
          <div style={{background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.25)",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#06b6d4",fontWeight:600}}>Equipment sized for {materials.gallons.toLocaleString()} gallon pool</div>
          {equipment.map(eq=>(
            <div key={eq.label} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"14px 16px 10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{flex:1,minWidth:0}}><div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>{eq.label}</div><div style={{fontWeight:700,fontSize:14,color:"#e2e8f0",lineHeight:1.3}}>{eq.model}</div></div>
                  <div style={{background:"#1e293b",borderRadius:8,padding:"3px 10px",fontSize:10,color:"#94a3b8",fontFamily:"monospace",flexShrink:0,marginLeft:10}}>SKU: {eq.sku}</div>
                </div>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{eq.note}{eq.qtyNote && <span style={{color:"#f59e0b",fontWeight:700}}> - {eq.qtyNote}</span>}</div>
              </div>
              {eq.asin && (<a href={pentairLink(eq.asin)} target="_blank" rel="noopener noreferrer" style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:"linear-gradient(135deg,rgba(255,153,0,0.15),rgba(255,120,0,0.08))", borderTop:"1px solid rgba(255,153,0,0.2)", textDecoration:"none", gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>📦</span><div><div style={{fontSize:12,fontWeight:700,color:"#ff9900"}}>Buy on Amazon</div><div style={{fontSize:10,color:"#64748b"}}>You earn {eq.earn} affiliate commission</div></div></div>
                <span style={{color:"#ff9900",fontSize:16}}>→</span>
              </a>)}
            </div>
          ))}
          <div style={{background:"rgba(255,153,0,0.06)",border:"1px solid rgba(255,153,0,0.2)",borderRadius:12,padding:12,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#ff9900",fontWeight:700,marginBottom:3}}>💰 Earn 3-8% on every Pentair purchase</div>
            <div style={{fontSize:11,color:"#64748b"}}>All equipment links are pre-tagged with your Amazon affiliate ID.</div>
          </div>
        </>}

        {tab===7&&<>
          <div style={card}>
            <div style={sectionTitle}>Guide Mode</div>
            <div style={{display:"flex",gap:8}}>{[{id:"contractor",label:"👷 Contractor"},{id:"diy",label:"🏠 Homeowner DIY"}].map(m=>(<button key={m.id} onClick={()=>setGuideMode(m.id)} style={{flex:1,padding:"10px 0",borderRadius:10,border:`2px solid ${guideMode===m.id?"#06b6d4":"#334155"}`,background:guideMode===m.id?"rgba(6,182,212,0.1)":"#1e293b",color:guideMode===m.id?"#06b6d4":"#94a3b8",cursor:"pointer",fontSize:13,fontWeight:700}}>{m.label}</button>))}</div>
            {guideMode==="diy"&&<div style={{marginTop:12,padding:"10px 12px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:10,fontSize:12,color:"#f59e0b"}}>⚠️ DIY pool building requires permits in all US states. Structural concrete & electrical must pass inspection.</div>}
          </div>
          {STEP_GUIDE.map((phase,i)=>(
            <div key={i} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,overflow:"hidden"}}>
              <div style={{background:"linear-gradient(135deg,rgba(6,182,212,0.15),rgba(2,132,199,0.08))",padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"rgba(6,182,212,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{phase.icon}</div>
                <div style={{flex:1}}><div style={{fontSize:10,color:"#06b6d4",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em"}}>{phase.phase}</div><div style={{fontWeight:700,fontSize:15,color:"#e2e8f0"}}>{phase.title}</div></div>
                <div style={{fontSize:11,color:"#64748b",background:"#1e293b",padding:"3px 10px",borderRadius:20}}>⏱ {phase.days}</div>
              </div>
              <div style={{padding:"12px 16px"}}>{phase.steps.map((step,j)=>(<div key={j} style={{display:"flex",gap:10,marginBottom:9}}><span style={{minWidth:20,height:20,borderRadius:"50%",background:"rgba(6,182,212,0.15)",color:"#06b6d4",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{j+1}</span><span style={{fontSize:13,color:"#94a3b8",lineHeight:1.5}}>{step}</span></div>))}</div>
            </div>
          ))}
        </>}

        {tab===8&&<>
          <div style={{background:"linear-gradient(135deg,rgba(245,158,11,0.18),rgba(217,119,6,0.1))",border:"1px solid rgba(245,158,11,0.35)",borderRadius:16,padding:16}}>
            <div style={{fontSize:14,fontWeight:800,color:"#f59e0b"}}>💰 Affiliate Shopping - You Earn on Every Purchase</div>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>All links are pre-tagged with your affiliate ID. Replace placeholders with your real IDs before launch.</div>
          </div>
          <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>{SHOP_CATEGORIES.map(cat=>(<button key={cat.id} onClick={()=>setShopCat(cat.id)} style={{whiteSpace:"nowrap",padding:"10px 16px",minHeight:40,borderRadius:20,border:`2px solid ${shopCat===cat.id?"#06b6d4":"#334155"}`,background:shopCat===cat.id?"rgba(6,182,212,0.1)":"#111827",color:shopCat===cat.id?"#06b6d4":"#94a3b8",cursor:"pointer",fontSize:12,fontWeight:600}}>{cat.icon} {cat.label}</button>))}</div>
          {activeCat?.products.map(product=>{
            const rc=RETAILER_COLORS[product.retailer]||{bg:"rgba(100,116,139,0.1)",border:"rgba(100,116,139,0.3)",text:"#94a3b8"};
            const saved=wishlist.includes(product.name);
            return(
              <div key={product.name} style={{background:"#111827",border:"1px solid #1e293b",borderRadius:14,padding:16}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:50,height:50,borderRadius:10,background:"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{product.img}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}><div style={{fontSize:14,fontWeight:600,color:"#e2e8f0",lineHeight:1.3}}>{product.name}</div><button onClick={()=>toggleWishlist(product.name)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,flexShrink:0,padding:10,margin:-10,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>{saved?"❤️":"🤍"}</button></div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}><span style={{padding:"2px 9px",borderRadius:20,background:rc.bg,border:`1px solid ${rc.border}`,color:rc.text,fontSize:11,fontWeight:700}}>{product.retailer}</span><span style={{padding:"2px 9px",borderRadius:20,background:"rgba(6,182,212,0.1)",border:"1px solid rgba(6,182,212,0.2)",color:"#06b6d4",fontSize:11,fontWeight:600}}>{product.badge}</span><span style={{fontSize:11,color:"#64748b"}}>Earn: {product.earn}</span></div>
                  </div>
                </div>
                <a href={product.link} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:12,padding:"10px",borderRadius:10,background:"linear-gradient(135deg,rgba(6,182,212,0.18),rgba(2,132,199,0.12))",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",textDecoration:"none",fontSize:13,fontWeight:700,textAlign:"center"}}>Shop on {product.retailer} →</a>
              </div>
            );
          })}
          {wishlist.length>0&&(
            <div style={{background:"#111827",border:"1px solid rgba(245,158,11,0.3)",borderRadius:14,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:10}}>❤️ Saved Items ({wishlist.length})</div>
              {wishlist.map(item=>(<div key={item} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #1e293b"}}><span style={{fontSize:13,color:"#94a3b8"}}>{item}</span><button onClick={()=>toggleWishlist(item)} style={{background:"none",border:"none",cursor:"pointer",color:"#64748b",fontSize:12,padding:"8px 4px",minHeight:36}}>Remove</button></div>))}
            </div>
          )}
        </>}

        {tab===9&&<QuickRender len={len} wid={wid} shape={shape} finishId={finishId} colorId={colorId} entries={entries} hardscapes={hardscapes} />}
        {tab===10&&<BuildTracker projectName={projectName} clientName={clientName} clientEmail={clientEmail} />}
        {tab===11&&<SettingsScreen userMode={userMode} setUserMode={setUserMode} />}
      </div>

      {/* Quote Builder + Timeline slide up from Cost Estimator tab */}
      {tab===5&&<div style={{padding:"0 14px 14px",maxWidth:820,margin:"0 auto",display:"flex",flexDirection:"column",gap:14}}>
        <QuoteBuilder shape={shape} len={len} wid={wid} depthId={depthId} finishId={finishId} entries={entries} hardscapes={hardscapes} extras={extras} localRates={localRates} projectName={projectName} clientName={clientName} />
        <BuildTimeline shape={shape} len={len} wid={wid} depthId={depthId} entries={entries} hardscapes={hardscapes} />
      </div>}
    </div>
  );
}
 