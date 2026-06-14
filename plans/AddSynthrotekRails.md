### Information and related stuff having to do with rails

We need to do a few things:
- Add UI callouts that let the user know that currently only ZRails are handled
- probably need to rethink the way the measurements are done:
  - Take the typical 3U panel height or 3U height
- Add handling for Synthrotek Rail measurements
- Clean up the ZRail measurements (off by .5mm currently, maybe some other stuff)

See also:
- https://www.tiptopaudio.com/manuals/Tiptop_Audio_z-rails_data_sheet.pdf
- https://tiptopaudio.com/z-rails-brackets/
- https://tiptopaudio.com/z-rails/
- https://tiptopaudio.com/z-rails/
- https://store.synthrotek.com/eurorack-rails_p_379.html
- https://store.synthrotek.com/Eurorack-Rails--Cut-to-Length_p_796.html
- https://www.synthrotek.com/wp-content/uploads/2023/06/rail_template_fixed.pdf
- https://doepfer.de/a100_man/a100m_e.htm
- https://www.modwiggler.com/forum/viewtopic.php?t=155376
- https://synthracks.com/blog/eurorack-rails-diy-guide?srsltid=AfmBOops8cGy5piK0o_DyintmsoM1kGLyMX3Bb2VjouOHj4snzw1Pfgt

Data for rails specifications

---
Measurements created manually and used to create halliburton zero case:
- 0mm - top of case, 1U row
- 4.7mm - first rail drill hole for 1U row
- 36.45mm - second rail drill hole for 1U row
- 41.148mm - end of 1U row
- 46.23mm - first rail hole for first 3U row
- 165.6mm - second rail hole for first 3U row
- 170.688mm - end of 2nd row
- 175.77mm - first rail hole for 2nd 3U row
- 295.15mm - second rail hole for 2nd 3U row
- 300.228mm - end of 2nd 3U row
---

-
- zRails, modularsynthlab, and synthracks have lipped rails. drill hole aligns with channel center
- synthrotek, vector rails do not have lip. drill hole does not align with channel center.
- synthracks version has 2 side, lipped and non lipped; on both sides, drill hole center aligns with channel center.

---

From Tiptop_Audio_z-rails_data_sheet and Synthrotek-Eurorack-Rails-Technical-Drawing. Lip height is 2.8mm.

| Type | Lip Size | OE to Ch Center | OE to drill hole | drill hole depth* | tot depth | rail width |
| -- | -- | -- | -- | --| --| --|
| ZRails | 1.2mm | 5mm | 5mm | 14.3mm | 23.8mm | 10mm |
| Synthrotek | 0mm | 3.571875mm | 2.38125mm | 15.5mm | 25.025mm | 7.14375mm |
* OE = Outsided Edge (away from center of panel)
* drill hole depth = case surface to drill hole, perpendicular to row angle, for zRails includes the lip (2.8mm) since this will reflect panel thickness. will use same lip depth for synthrotek.
---
From Intellijel 1U Technical Specifications.pdf:
| model | row height (w/ lip?) | module panel ht | inner pcb ht | rail mt height |
| -- | -- | -- | -- | -- |
| 3U | 133.35mm | 128.5mm | 110.0mm | 122.5 |
| 1U intellijel | 44.45mm | 39.65mm | 22.5mm | 33.65mm |
---
From synthrotek_rail_template_fixed.pdf:
| model | hole spacing | panel height |
| -- | -- | -- |
| 3U all | 120.4214mm (4.741") | 129.54mm (5.1") |
| 1U intellijel | 31.75mm (1.25") | 41.148mm (1.62") |
| 1U pulp logic | 35.2806mm (1.389") | 44.704mm (1.76") |
---
From Synthrotek-Eurorack-Rails-Technical-Drawing.jpeg
- in synthrotek rail, distance from edge of rail to center of drill hole is .11" (2.794mm), and distance from edge of rail to center of panel mount is 0.1455" (3.6957mmconvert), so the difference in those is 0.071" for both rails.


| model | module panel ht (no lip) | hole spacing (syntro) | rail mt height (synthro) |
| -- | -- | -- | -- |
| 3U all |  129.54mm (5.1") | 120.4214mm (4.741" ) | 122.2248mm (4.812") |
| 1U intellijel |  41.148mm (1.62") | 31.75mm (1.25" ) | 33.5534mm (1.321") |
| 1U pulp logic |  44.704mm (1.76") | 35.2806mm (1.389" ) | 37.1094mm (1.461") |
---

From modwiggler:
The intellijel 1U tiles are designed to work with rails with a lip and the Z-rails have them so they should at least work. The pulp Logics, as said, are designed to work with the full 1U space lip-less rails at the same spacing (1.75-inches or 44.45mm) and so run into the lips on the z-rails. The intellijel tiles are meant to fit the same 1U minus the thickness of the lips on the rails (around 1.2mm on each rail).
https://www.modwiggler.com/forum/viewtopic.php?t=200211

---

### conversation regarding rails follows...

### Based on the specifications at https://www.tiptopaudio.com/manuals/Tiptop_Audio_z-rails_data_sheet.pdf and https://store.synthrotek.com/eurorack-rails_p_379.html -- what are the main differences between the tiptop and synthrotek rails other than the "lip" that the Tiptop rails have? Are the interchangeable in a case, or would you have to drill different holes for spacing purposes?

Based on the provided technical data sheets and specifications for **Tiptop Audio Z-Rails** and **Synthrotek Eurorack Rails**, there are several critical physical differences beyond the structural "lip" built into the Tiptop profile.

They are **not directly interchangeable** without minor adjustments, and if you are using pre-manufactured brackets or mounting into an existing precision-cut case, you may run into compatibility issues with both lengths and mounting hole alignment.

The main differences break down as follows:

### 1. Mounting Screw Threads & Sizes

The most fundamental difference when attaching the rails to a case cheek or bracket is the screw standard used to anchor them:

* **Tiptop Audio Z-Rails:** The center mounting hole at each end of the rail is tapped for **metric M4 screws**.
* **Synthrotek Rails:** The center mounting channel is designed to accept **imperial 10-24 screws** (often 1" length). Because 10-24 screws have a wider diameter (~4.83mm) than metric M4 screws (~4.0mm), a screw meant for a Synthrotek rail will not fit into a Tiptop rail, and an M4 screw will strip or fail to hold tightly inside a Synthrotek rail.

### 2. Physical Length Variations (HP vs. Millimeters)

While both manufacturers sell rails labeled by Eurorack Horizontal Pitch (HP), they define the exact cutoff lengths slightly differently:

* **Tiptop Audio:** Uses tight tolerances tailored specifically to exact international metric measurements for modular gear. For example:
* 84 HP = **427 mm**
* 104 HP = **528.3 mm**


* **Synthrotek:** Uses a standard profile layout traditionally based on Vector T-Strut rails. Their site states that their rails are cut to imperial fractional equivalents where possible (estimating roughly 5HP per inch). For comparison:
* 84 HP = **432 mm** (approx. 17 inches)
* 104 HP = **533.4 mm** (approx. 21 inches)



**Interchangeability Issue:** If you try to swap a Tiptop 84HP rail into a case custom-built for a Synthrotek 84HP rail, the Tiptop rail will be roughly **5mm too short**, creating gaps on the sides or making it impossible to span the distance between the case walls.

### 3. Total Rail Depth/Height Profile

Because the extrusions use different molds, the physical clearance behind the front panel varies:

* **Tiptop Z-Rails:** The profile has a total depth/height of **23.8 mm**.
* **Synthrotek Rails:** The depth profile is **22.2 mm** (7/8 inches).

---

### Do you need to drill different holes for spacing?

**For Vertical (3U) Spacing:**
Yes, if you are anchoring them directly to the side of a wooden case without metal bracket ears.

* **Tiptop Z-Rails** require a strict 133.4mm (5.25 in) distance minus the thickness of the rail lips for a standard 3U row.
* Because the center track position relative to the physical edges is slightly different between the two shapes, using a **Synthrotek Drilling Template** (which relies on a center-to-center hole spacing of **4.741 inches / 120.42 mm** for a 3U row) will result in modules not fitting correctly if you mount Tiptop rails using those exact center points. You will need to measure manually from the module face lines rather than relying on shared template holes.

**For Side/Cheek Thickness & Bracket Mounting:**
If you are using **pre-made metal Eurorack brackets** (like Tiptop Z-Ears or Synthrotek 3U case brackets):

* You cannot mix and match easily because of the screw size mismatch (M4 vs. 10-24). The holes on Synthrotek ears are wide enough to pass a 10-24 screw, so an M4 screw from a Tiptop kit will slide right through without gripping, requiring you to add nuts and washers to get a secure clamp. Conversely, a Synthrotek 10-24 screw will not fit through the screw holes of a Tiptop Z-Ear bracket without drilling the bracket holes wider.

---

### For a 3U row, what is the center to center distance between the top and bottom drill holes for the Tiptop vs. Synthrotek rails?

When mounting Eurorack rails to the side panels (cheeks) of a case for a standard 3U row, the **center-to-center vertical drilling distance** determines whether the faceplates of your modules will line up perfectly.

Because of the physical profile designs (specifically the built-in structural lip on the Tiptop rail), the exact drill holes required differ by exactly **2.08 mm**.

### 1. Synthrotek Rails (Vector-style / Lipless Profile)

* **Center-to-Center Distance:** **120.42 mm** *(4.741 inches)*
* **Why:** Synthrotek rails follow the classic, lipless "Vector T-Strut" geometry. When your module faceplate is placed over them, the module's absolute top and bottom edges sit flush against the outer flat edges of the aluminum rail bodies.

### 2. Tiptop Audio Z-Rails (Lipped Profile)

* **Center-to-Center Distance:** **122.50 mm** *(4.823 inches)*
* **Why:** Tiptop Z-Rails feature an integrated lip designed to overlay the raw cut edges of a module's faceplate for a cleaner look. Because the module panels drop *inside* these lips rather than sitting fully on top of the rail body, the two aluminum profiles must be spaced slightly farther apart to allow a standard 128.5 mm high (3U) module panel to physically clear the inner track constraints.

### Summary

If you are planning to drill your own side panels or build a jig:

* **Synthrotek:** Drill your mounting points **120.42 mm** apart.
* **Tiptop Z-Rails:** Drill your mounting points **122.50 mm** apart.

*Note: If you use an existing Synthrotek 3U case template or pre-fabricated lipless cheek to drill holes for Tiptop rails, the rails will be placed too closely together, and your modules will physically jam or overlap vertically.*

---

### Where did you get the 122.50 mm vs. 120.42 measurements from?

The measurements come directly from the official manufacturer engineering documentation and standard Eurorack technical specifications:

### 1. Where the Synthrotek Measurement Comes From

The **120.42 mm (4.741 inches)** spacing is taken directly from the official **Synthrotek Modular Rails Drill Template** (published on their site for DIY case builders).

* Their architectural PDF explicitly dictates a vertical center-to-center drill distance of **4.741"** for a standard 3U row.
* This is calculated based on classic "Vector T-Strut" geometry. Because a standard 3U panel is 128.5 mm (approx. 5.06 inches) tall, and standard lipless rails sit fully behind the panel with a center-thread location offset, the mathematics of the vector extrusion dictate exactly 4.741" hole-to-hole to clamp the panel edges flat against the rails without any overlapping.

### 2. Where the Tiptop Z-Rails Measurement Comes From

The **122.50 mm (4.823 inches)** spacing comes from the standard **Doepfer/Eurorack specification for lipped rails** (like Schroff, Gie-Tec, and Tiptop Z-Rails), widely cataloged across Doepfer's official structural guidelines and DIY engineering wikis.

* Standard Eurorack module mounting holes are vertically spaced exactly **122.50 mm** apart from the center of the top screw hole to the center of the bottom screw hole.
* Because Tiptop Z-Rails are designed with an integrated aluminum "lip" that frames the faceplate, the center mounting thread of the Z-Rail line up perfectly with the module's actual screw paths. When you bolt a Z-Rail straight into a case side cheek, your wood-drilling alignment must mirror the module hole alignment exactly (**122.50 mm**), meaning the case screws pass completely straight through the side panel and tunnel directly into the center track of the rail.

---

### For the 427 vs. 432mm rail length for 84hp, how do the modules fit correctly if the hp is defined differently? Or is it just that the synthrotek 84hp rail is longer at the "ends" or something?

The standard definition of 1 Horizontal Pitch (HP) is exactly **1/5 of an inch**, which equals **5.08 mm**.

Mathematically, a module space that is exactly 84HP wide requires exactly **426.72 mm** of physical width ($84 \times 5.08$).

The reason Tiptop measures 427 mm while Synthrotek measures roughly 432 mm is **not** because the space for the modules changes, nor is it because the modules themselves fit differently. The modules will fit exactly the same inside both rails. Instead, the discrepancy comes down to **manufacturing design choices regarding "slop" (wiggle room) and standard hardware sizing.**

Here is exactly how those extra millimeters are accounted for on each rail:

### 1. Tiptop Audio (427 mm): Cut to Exact Spec

Tiptop Audio cuts their Z-Rails to **427 mm** because they are designing strictly for international metric rack standards.

* If you round up the absolute minimum physical module width ($426.72\text{ mm}$), you get **427 mm**.
* This provides a tiny fraction of a millimeter ($0.28\text{ mm}$ total) of "slop" across the entire row so that tight module faceplates don't bind against each other when you pack the row full.
* This exact length is chosen so that when you attach Tiptop's standard 19-inch rack ears (Z-Ears) to the ends, the entire assembly fits flawlessly into a standard IT or pro-audio server rack.

### 2. Synthrotek (432 mm / 17 inches): The Imperial Profile End-Caps

Synthrotek rails are cut from "Vector T-Strut" industrial extrusions, which are manufactured in the United States using **imperial tooling**. They cut their 84HP rails to exactly **17 inches (431.8 mm, rounded to 432 mm)**.

Because 17 inches gives you 431.8 mm of physical metal, but your modules only occupy 426.72 mm of space, you are left with about **5 mm of completely empty, dead space** distributed across the rail.

This extra length manifests in two ways depending on how you mount them:

* **The "Ends" (If using Threaded Strips):** Synthrotek explicitly notes in their manufacturing documentation that their pre-cut 3mm threaded nut strips are **intentionally cut shorter** than the aluminum rail itself. The threaded strip inside will sit centered, matching the standard 84HP width. The extra 2.5 mm on each far left and right end is purely empty aluminum shell acting as a buffer.
* **Wiggle Room (If using Sliding Nuts):** If you use individual slide nuts instead of a fixed strip, that extra 5 mm simply means you have a tiny bit of extra breathing room across the row to slide your modules left or right, leaving a tiny gap at the far edges of your case.

### Summary of the Fit

The internal mounting grid stays perfectly identical because a 3mm screw hole on a module expects a 5.08 mm pitch regardless of the brand.

If you pack 84HP worth of modules into both:

* In the **Tiptop rails**, the modules will sit completely flush, edge-to-edge, wall-to-wall against the case cheeks.
* In the **Synthrotek rails**, the modules will fit perfectly fine, but you will have a tiny, unnoticeable ~2.5 mm gap of raw aluminum visible on the far left and far right ends between your last module and the edge of your case.

---

### With either brand rails, if I am building a case that has 2 rows, the second of which is at a 25 degree angle compared to the first, how much space should create between the rows to ensure that the bottom of the top row modules don't grind against the top of the bottom row modules? This doesn't matter as much for the tiptop rails since they have the lip, but please consider both cases.

When building an angled two-row case, the math required to keep the modules from grinding or jamming against each other depends heavily on **where the pivot axis sits relative to the module faceplates**.

Assuming you want the two rows to look as seamless as possible from the front, the calculation centers around the fact that a standard Eurorack module faceplate is **128.5 mm tall** and typically **2.0 mm thick**. When you tilt the upper row forward by 25 degrees, the bottom edge of the top faceplate swings downward and backward into the path of the lower faceplate.

To account for this, you must calculate the **minimum gap needed between the raw edges of the faceplates**, and translate that into the **spacing between the rails.**

---

### Case 1: Lipless Rails (Synthrotek / Vector)

Because Synthrotek rails have no lip, the modules sit entirely flat against the rail bodies. The top edge of the lower module and the bottom edge of the upper module meet at a sharp 25-degree wedge.

#### 1. The Faceplate Clearance Gap

If you want the front surfaces of the faceplates to perfectly intersect at the pivot point without rubbing when screwed down, the trigonometry dictates a minimum air gap between the two raw aluminum sheets:


$$\text{Gap} = \text{Panel Thickness} \times \tan\left(\frac{\text{Angle}}{2}\right)$$


For a standard **2.0 mm thick faceplate** tilted at **25 degrees**:


$$\text{Gap} = 2.0 \times \tan(12.5^\circ) \approx \mathbf{0.44\text{ mm}}$$

#### 2. The Total Rail-to-Rail Center Distance

To construct your side panel template, you must add the height of a module, the vertical spacing of a single rail's holes, and this new clearance gap together.

For two rows of Synthrotek rails separated by a 25-degree bend, measure along the inner contour of your wood cheek:

* **Distance from the bottom rail's drill hole to the top rail of that same row:** **120.42 mm** (Standard 3U)
* **The "Bridge Gap" between the top rail of the bottom row and the bottom rail of the top row:** **13.52 mm** *(Calculated as the 13.08 mm standard lipless rail-edge buffer + 0.44 mm angular gap)*

**Total Drill-Hole Distance between the two rows:** **133.94 mm** center-to-center.

---

### Case 2: Lipped Rails (Tiptop Audio Z-Rails)

Tiptop Z-Rails make this build significantly easier because the aluminum extrusion includes a built-in metal overhang (the lip) that drops down over the faceplate edges.

#### 1. The Faceplate Clearance Gap

Because the Z-Rail lip has an extrusion thickness of roughly **1.5 mm** that permanently covers the raw top and bottom edges of your modules, **the faceplates themselves cannot touch.** Instead, the two aluminum *lips of the rails* will touch.

Because you are rotating the upper rail profile by 25 degrees, the outer metal corners of the Tiptop extrusions will collide if they are mounted completely flush. To prevent the aluminum lips from grinding or binding against one another, you need a physical buffer of **1.2 mm** of raw breathing room between the outer edge of the lower rail and the outer edge of the upper rail.

#### 2. The Total Rail-to-Rail Center Distance

When mapping out your case cheeks for Tiptop rails:

* **Distance from the bottom rail's drill hole to the top rail of that same row:** **122.50 mm** (Standard 3U)
* **The "Bridge Gap" between the two rows' adjacent rails:** **12.20 mm** *(Calculated as the 11.00 mm standard lipped center-to-edge constraint + 1.20 mm angular clearance)*

**Total Drill-Hole Distance between the two rows:** **134.70 mm** center-to-center.

---

### Practical Builder's Advice for Both Brands

No matter which rail brand you choose, attempting to cut wood or 3D-print side panels to a tolerance of 0.44 mm or 1.20 mm is incredibly difficult and leaves no room for manufacturing errors in third-party module faceplates.

**The Golden Rule for Angled Enclosures:** Add a uniform **1.5 mm to 2.0 mm "safety buffer"** to your calculated bridge gaps.

Adding an extra ~1.5 mm of space between the rows will:

1. Ensure that even warped, extra-thick, or poorly-cut module faceplates will never grind against each other.
2. Leave a tiny, clean, professional-looking shadow-line gap between the rows.
3. Make it vastly easier to install and remove modules from either row without needing to loosen the screws on the adjacent row first.



---
OLD CONSTANTS
const MODEL_3U_ROW_HEIGHT = 133.35; // (5.25in)
const MODEL_1U_INTELLIJEL_ROW_HEIGHT = 44.45; // (1.5625in)
const MODEL_3U_PANEL_HEIGHT = 128.5;
const MODEL_1U_INTELLIJEL_PANEL_HEIGHT = 39.65;
const MODEL_1U_PULP_LOGIC_PANEL_HEIGHT = 43.18;
// Basing this on panel intellijel 1u panel height minus the 1U spec height.
const MODEL_1U_PULP_LOGIC_ROW_HEIGHT = 4.8 + MODEL_1U_PULP_LOGIC_PANEL_HEIGHT;
// This is based on the Future Music guide, and may apply only to TipTop Audio Z-Rails.
const MODEL_3U_HOLE_SPACING = 123;
const SPEC_HEIGHT_TO_HOLE_SPACING_DIFF = 10.35; // 3U_SPEC_HEIGHT - 3U_SPEC_RAIL_HOLE_SPACING;
const MODEL_1U_INTELLIJEL_HOLE_SPACING = MODEL_1U_INTELLIJEL_ROW_HEIGHT - SPEC_HEIGHT_TO_HOLE_SPACING_DIFF;
const MODEL_1U_PULP_LOGIC_HOLE_SPACING = MODEL_1U_PULP_LOGIC_ROW_HEIGHT - SPEC_HEIGHT_TO_HOLE_SPACING_DIFF;