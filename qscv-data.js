/* Shared QSCV catalog — extracted from QSCV Audit App.dc.html */
export const CATS = [
  {num:"I", name:"Product Quality", weight:15, groups:[
    {name:"Station 1 · Grill", items:[
      ["H","CVAP steaming time and temperature are followed. (45 mins; SSC 15 mins; 160°F–170°F)"],
      ["M","Grill assignment is followed. No cross-contact of products in the grill."],
      ["L","Bastings are properly applied; no bald spots"],
      ["L","Sear or char color is within standard."],
      ["L","Grill marks are present in the final product"],
      ["H","Internal reheating temperature is achieved for final products (165°F or 74°C)"]]},
    {name:"Station 2 · Fry", items:[
      ["M","Fresh chicken is cut properly (SFC — 8 cuts; BF — 3pcs solo, 6pcs family)"],
      ["L","Onions are cut to standard coil size 0.5cm"],
      ["H","Standard marinating time is followed (SFC 3H–18H; SFP 2H–36H)"],
      ["M","Standard coating procedure is followed; coatings and batter properly applied, no bald spots or caking"],
      ["H","Standard frying time is followed (11 mins chicken; 4 mins dory; 3 mins per side pan-fried; 3 mins strip, porkchop, fries, bacon; 1m35s onion brick)"],
      ["H","SFC, CS, and SFP have internal temperature of 165°F or 74°C"],
      ["M","No off-color or burnt spots in final products; coated fried products within standard color, no sogginess"],
      ["H","Fried chicken is cooked thoroughly, no presence of blood within the chicken."],
      ["M","Oil quality is within standard. Oil monitoring and replenishment followed as per schedule."],
      ["M","No rancid or off-odor smell in final product; visually not greasy"],
      ["M","Standard portion sizes are followed."]]},
    {name:"Station 3 · Hot holding / bain marie", items:[
      ["M","Visually fresh, no burnt edges, no discoloration, and no mushy ingredients"],
      ["L","Sauces & soups are smooth and uniform, no hardened lumps and crystallization"],
      ["L","Vegetables are cut according to their standard sizes"],
      ["M","Standard portion control per serving is followed."],
      ["H","No off-odor, rancid, or rotten smell from the final product"]]},
    {name:"Station 4 · Cold station", items:[
      ["H","Visually fresh, no discoloration, and no signs of pest on greens/vegetables"],
      ["L","Sauces are smooth and uniform, no lumps and condensation"],
      ["M","Dressing/sauce ratio is followed."],
      ["M","Pasta is reheated according to its standard time & temperature; not mushy, still al dente"]]},
    {name:"Station 5 · Bar", items:[
      ["H","All garnishes and fresh ingredients are visually fresh, free from discoloration, spoilage, and signs of pest activity."],
      ["M","Beverages are prepared according to the approved recipe and standard procedure."],
      ["H","Ice scooper is clean, sanitized, and properly stored; scoop handle does not contact ice."],
      ["M","Beverage containers, bottles, pitchers, and dispensers are clean, sanitized, and free from residue or buildup."],
      ["M","Canned beverages are clean, intact, and free from dents, rust, leaks, swelling, or damage."],
      ["H","Canned beverages are within expiration/best-before date, properly rotated using FIFO/FEFO"],
      ["M","Ice bin is in good condition, with cover, no signs of mold, free from contaminants"]]},
    {name:"Station 6 · Plating & assembly", items:[
      ["M","Portion accuracy vs. standard"],
      ["L","Garnish placement & freshness"],
      ["M","Plate/container cleanliness"],
      ["L","Visual match to photo"]]}
  ]},
  {num:"II", name:"Personnel Health & Disease Control", weight:10, groups:[
    {name:"All personnel", items:[
      ["H","100% compliance to proper grooming and hygiene (no dirty or long fingernails, no facial hair, body odor; wears facemask/mouthguard)"],
      ["H","100% compliance to proper handwashing and sanitizing techniques; all staff comply with the 30-minute handwash call."],
      ["H","Gloves are changed after handling raw products, money, garbage, restroom visits, or changing stations."],
      ["L","Personnel lockers are clean and organized; personal food in closed containers, no clutter or food debris."],
      ["H","No open wounds; if with wounds, properly covered and refrained from handling food."],
      ["M","Personal water jugs are placed away from food prep areas."],
      ["L","Restroom & break schedule are followed; staff compliant to put-on policy"]]}
  ]},
  {num:"III", name:"Cleaning & Sanitation", weight:10, groups:[
    {name:"Housekeeping & waste", items:[
      ["M","100% compliance to cleaning schedule; facilities, equipment, tools, and utensils cleaned per schedule"],
      ["M","100% compliance to good housekeeping; kitchen & FOH stations clean at all times; CLAYGO practiced"],
      ["H","Waste segregation thoroughly followed; no mix-up of biodegradable and non-biodegradable; hazardous/broken wares kept away from food prep areas"],
      ["M","100% compliance to waste disposal schedule. No overflowing trash. Bins covered per color coding, clearly labelled."]]},
    {name:"Chemicals", items:[
      ["H","Correct chemicals are used. No unapproved chemicals. Correct application followed."],
      ["M","All chemical containers/dispensers correctly labelled, clean, and functional."],
      ["H","All chemicals follow the correct dilution."]]},
    {name:"Tools & dishwashing", items:[
      ["H","Towel, tools, and mop color-coding strictly followed. No cross-contact of cleaning tools."],
      ["M","Dishwashing and sanitizing facilities are thoroughly cleaned and follow cleaning schedule."],
      ["H","Temperature control for dishwashing machine and glass machine works and follows correct setting."],
      ["L","Bussing kit is kept clean, food debris removed after bussing tables. Spray bottles regularly refilled."],
      ["L","Cleaning monitoring forms are updated and well-documented."]]}
  ]},
  {num:"IV", name:"Maintenance of Facilities, Utilities & Equipment", weight:10, groups:[
    {name:"Building", items:[
      ["M","PMS and service repairs are regularly conducted and completed."],
      ["M","Floors and drains are fixed, no loose or missing screws. Tiles complete, no cracks or loose tiles"],
      ["M","Walls and ceilings are closed, no open gaps or boards; no chipping paint or cobwebs"],
      ["L","Doors close fully. No loose hinges or missing screws, no dilapidated parts or chipped glass/paint."],
      ["M","Lightings are covered, clean, and free from pest. No busted lights"],
      ["L","No accumulation of dust and dirt on the vents"]]},
    {name:"Equipment & devices", items:[
      ["M","No rust, chipped, loose or missing parts on tools, equipment, and facilities"],
      ["M","No recurring issues. All FCD concerns are addressed and updated."],
      ["H","Measuring devices (thermometers, salt meters, refractometers) kept in good condition. Calibration verified daily."],
      ["L","Menus, marketing paraphernalia and displays are clean and properly updated"]]}
  ]},
  {num:"V", name:"Safe Food Handling", weight:20, groups:[
    {name:"Storage", items:[
      ["M","Dry raw materials properly stored with correct wall and floor clearance, labelled, stored at 27–32°C"],
      ["H","Freezer/chiller products at correct temperature (0–4°C chilled; −18 to −10°C frozen); no thawing, freezer burn, or broken packaging."],
      ["H","All products follow FIFO and FEFO and are labelled with production/receiving and expiry date"],
      ["M","Segregation of expired, spoiled, or waste items. All documented and disposed of properly."]]},
    {name:"Hazards & cross-contamination", items:[
      ["H","No chemical, biological, or physical hazards in BOH and FOH areas"],
      ["H","No cross-contamination or cross-contact of raw materials, tools and equipment. Allergenic ingredients prepared to prevent cross-contact."],
      ["H","All staff comply with the color-coding of knives and chopping boards."],
      ["H","No products stored in the TDZ for more than 4 hours (5°C to 60°C)"],
      ["H","All frozen items are thawed correctly. Forced thawing is not allowed."]]},
    {name:"Pest control", items:[
      ["H","No live or dead rodents or cockroaches in the kitchen or dining area; no signs of pest activity in all areas"],
      ["M","Pest traps are maintained clean and functional."]]}
  ]},
  {num:"VI", name:"Complaints & Non-Compliance", weight:5, groups:[
    {name:"Complaints & CAPA", items:[
      ["H","No guest complaints 1 week prior to audit day and during audit day"],
      ["H","CAPA from previous audit has been addressed and closed out."],
      ["L","Guest comment forms are present and accessible."],
      ["M","All store staff are in proper conduct and behavior during the audit"]]}
  ]},
  {num:"VII", name:"Front of the House", weight:10, groups:[
    {name:"Guest relations · greeting & seating", items:[
      ["H","Staff smile, greet, and acknowledge guests immediately (sincere, warm, spontaneous). REAL TALK is evident (15 sec)"],
      ["M","Staff seat guests politely, use open palm to lead guests to their table, excuse themselves before other duties"],
      ["M","Anticipates and responds promptly to guest needs (15 sec). Guests not waving or looking around for staff."],
      ["M","Presence of Dining Manager to supervise entire flow of restaurant operations"]]},
    {name:"Taking orders", items:[
      ["M","Staff gives open menu to guests: suggesting new product or current promo"],
      ["M","Staff is knowledgeable with products and current promo; can accurately describe components and pricing"],
      ["L","Staff applies suggestive selling, upselling & add-ons upon taking order"],
      ["M","Staff informs approximate serving time of products ordered (15–20 minutes)"],
      ["L","Staff introduces oneself before or after taking the order"],
      ["M","Staff is courteous and energetic, maintains eye contact, focused on the task, never distracted at guest table"]]},
    {name:"Serving orders", items:[
      ["H","Do quality control & check presentation before serving the product to guest"],
      ["M","Staff always uses serving tray when serving food, plates, glassware and condiments"],
      ["H","Staff holds glasses at the base, utensils at the handle, plates with thumb and forefinger; holds tray properly"],
      ["H","Order served accurately (right table, right orders); serving sequence followed, no cross serving or wrong drop"],
      ["L","Staff mentions product name"],
      ["M","Bottomless drinks and service water readily refilled (half empty)"],
      ["M","Staff ensures completion of orders"]]},
    {name:"Check back & bill out", items:[
      ["M","Staff asks guests for feedback on food and service"],
      ["M","Manager on Duty conducts table visit"],
      ["L","Staff applies dessert / coffee pitching before the guest finishes the main course"],
      ["L","Staff actively encourages guests to fill out the Guest Comment Card or digital survey"],
      ["M","Staff asks for cash or card payment and applicable privilege card (Senior citizen, PWD)"],
      ["L","Staff asks if the guest has a Racks Loyalty Card or applicable partner discounts"],
      ["H","Staff presents bill and receives payment, verbalizes payment received from guests"],
      ["H","Staff gives change and thanks the guest"],
      ["L","Staff alert to guests leaving, thanks the guest; presence of GRS during peak hours"]]},
    {name:"Table setup & ambience", items:[
      ["M","Standard table set-up, neatly arranged; clean utensils and tissue with logo"],
      ["M","Clean condiments and plate (regular & extra hot Racks sauce) placed at guest table prior to serving food"],
      ["L","Uses standard set-up kit, bussing kit, spray bottle, yellow towel, blue towel, white towel"],
      ["L","Dining area maintained at ambient temperature of 66–77°F"],
      ["L","No irritating noise from employees; no loitering"],
      ["L","Modulated music played, approved or provided by marketing department"]]},
    {name:"Pre-bussing & bussing out", items:[
      ["L","Staff politely asks permission of the guests before clearing the table"],
      ["M","During pre-bussing, soiled dishes, empty glassware, silverware and used napkins taken properly from the guest table"],
      ["M","Staff holds tray with open palm at the base"],
      ["M","Bussing out: staff wipes table with yellow sanitized towel, dries with blue towel, white for utensils & wares, without annoying sound"],
      ["M","Racks sauces and other condiments clean; not oily & sticky bottle / nozzle"],
      ["L","Staff cleans chairs, removes debris under table, lines up chairs for an orderly appearance"]]},
    {name:"Delivery services / aggregators", items:[
      ["M","Aggregator devices properly working (Grab, foodpanda, Klik-it); schedule in line with store operating schedule"],
      ["M","Menu checked to update product availability and promo activations"],
      ["H","Orders prepared in a timely manner; standard preparation followed and orders well sealed"],
      ["M","Complete orders checked; with condiments and utensils"],
      ["L","Rider logs details on logbook (green marker) and is assisted on dispatch of the product"]]}
  ]},
  {num:"VIII", name:"Speed of Service", weight:10, speed:true, groups:[]},
  {num:"IX", name:"Records & Documentation", weight:10, groups:[
    {name:"Records", items:[
      ["H","Ice and water potability tests / micro analysis conducted monthly or per LGU requirements. Results filed and updated."],
      ["M","Changing of water filter is kept updated and done according to schedule"],
      ["H","All business permits are complete and updated, displayed, clean and visible."],
      ["H","Health certificates of all personnel are filed and documented."],
      ["M","All employees have passed their respective FOH or BOH training."],
      ["H","All employees have passed their food safety training."]]}
  ]}
];

export const MEASURES = [
  {id:"ack",  name:"Acknowledging new guest", std:"15 seconds", limit:15,   n:5, max:6},
  {id:"ord",  name:"Waiting to order",        std:"2 minutes",  limit:120,  n:5, max:5},
  {id:"food", name:"Food serving time",       std:"15–20 minutes", limit:1200, n:5, max:5},
  {id:"bill", name:"Billing & change",        std:"2 minutes",  limit:120,  n:3, max:5},
  {id:"bus",  name:"Bussing time",            std:"2 minutes",  limit:120,  n:3, max:5}
];
export const PTS = {H:10, M:5, L:1};
export const CRIT = {H:"High", M:"Medium", L:"Low"};
export const SEV  = {H:"Critical", M:"Major", L:"Minor"};
export const SEVPTS = {H:10, M:5, L:1};
export const KEY = "qscv-audit-draft-v1";
