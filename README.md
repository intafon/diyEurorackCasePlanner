# DIY Eurorack Case Planner Tool

This is a simple one-page HTML app for messing around with planning how to build a DIY (cardboard) eurorack case. My original intent was just to create a tool that would allow me to visualize the angle for a 6U system case and gauge what amount of deskspace (and airspace) it would consume.

It is loosely based on the [Future Music guide for how to build your own cardboard eurorack modular case](http://www.musicradar.com/tuition/tech/how-to-build-your-own-cardboard-eurorack-modular-case-625196) and the accompanying PDF [CardboardCaseGuide](http://cdn.mos.musicradar.com/images/aaaroot/tech/7july15/DIY-Eurorack-case/CardboardCaseGuide.zip). Other specifications are based on information found on https://www.exploding-shed.com/synth-diy-guides/standards-of-eurorack/eurorack-dimensions/, https://intellijel.com/support/1u-technical-specifications/, and https://www.doepfer.de/a100_man/a100m_e.htm.

This currently only shows the measurements for the side view of the case. Dotted lines show the outlines of the material used on the bottom of the case as well as the front and back of the case to show overlap -- by default this material thickness is based on the Future Music guide's 5mm cardboard thickness.

<<<<<<< HEAD
_Note_: I have recently completed version 2 (alpha) of this project which can be found [here](https://intafon.com/diyeurorackcase/v2_alpha/). The new version features more rows (up to 5), 1U options (Intellijel and Pulp Logic), 3D case visualization, as well as an SVG/DXF export for laser cutting (outputs an SVG which you can pull into Adobe Illustrator or similar to arrange for laser cutting your material). I have it marked as still in alpha as, though I have built a few prototypes from cardboard using the tool, I have not yet accessed a laser cutter to test prototypes that way. I currently (May 26, 2026) have 2 prototypes layed out and ready to go, but have not visited a local fab place yet to do the cutting -- updates will ensue!
=======
Read the rest of this documentation or jump to [the planner](https://intafon.github.io/diyEurorackCasePlanner/).
>>>>>>> f7ae510 (re-arch project, add file export, and screwn size adjustment)

To see some of the other stuff I've got going on, including where to find my music and places to connect, please check out [intafon.com](https://intafon.com/).

## Export Features

The planner now supports exporting diagrams for use with laser cutters:

- **SVG Export**: Download the diagram as an SVG file with separate layers for cut lines, drill holes, and reference lines.
- **DXF Export**: Download the diagram as a DXF file compatible with most CAD software and laser cutting services.

## Parameters

TODO: Some changes have been made recently, and this needs to be updated.

There are several adjustable parameters in the planner.

The module depth max signifies the deepest module you wish to support in the case, which is set by default to 55mm. Note the "calculate needed rise" checkbox -- if checked, this calculates the necessary rise at the front of the case to accomodate the module depth. Since there is a slight (or unslight) angle for the first row of modules, the full module depth may not be needed. (if your first angle is 30 degrees, 47.6mm is sufficient for 55mm clearance)

Row 1 and 2 angles designate the angles at which the modules will sit. Note that row 2 angle is added to row 1, so it is really the differential to row 1.

Material thickness is set by default to 5mm -- this indicates the thickness of the cardboard (or whatever material) is used for the case. 5mm cardboard was used in Future Music's guide.

Pixels per cm -- this for now is my poor man's way of allowing the user to make the printed image of the case plan larger on the screen. I may remove this at a later date and just try to calculate the best guess at the sizing of the plan on the page to accomodate changes in window size.

## Finished build

The two photos below are of the first case I built from cardboard using the planner version 1 as a guide (and also the full bottom width measurement from the FM guide). The angles used were 10 and 15 degrees (where the 15 degree is from the 10 degree line, so actually 25 degrees). This uses 2 pair of Tiptop Audio Z-Rails, 84hp, and a Tiptop uZeus for power.

![Case without rails.](./imx/shape_finished.jpg "Case without rails.")

![Case with rails and modules.](./imx/case_finished.jpg "Case with rails and modules.")

## Allons-y!

Go to [the new V2 Alpha planner](https://intafon.com/diyeurorackcase/v2_alpha/) with more rows, 1U options, and 3D visualization.<br/>
Go to [the original planner](https://intafon.com/diyeurorackcase/v1/).
