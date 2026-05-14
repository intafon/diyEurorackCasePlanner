# What we want to do

Essentially we want to add box joints (cannot do dovetailing with thin plywood on a laser cutter) to the eurorack SVG and DXF outputs (as well as on the 3d rendering).

## Changes to the output

We need to make the following changes to the output:

- All notches and tabs should
  - be 1cm in width (or maybe 2?) (can be configurable).
  - All notches and tabs should be as deep/tall as the material thickness used for the case.
  - the notches or tabs should start with the first one centered in the middle of the given side, and extend in both directions from the center until the corner is reached.
- The bottom panel needs to have
  - notches:
    - all sides. The notches should start with the first one in the middle of the side, and repeat until they get to the corners.
- The front panel needs to have
  - tabs:
    - from the bottom
    - from the sides
- The side panels need to have
  - tabs:
    - from the bottom
  - notches:
    - on the front side
    - on the rear side
    - on the side used for the back shelf/top
- The back panel needs to have
  - notches:
    - on the sides
    - on the bottom
    - on the top
- The back top/shelf panel needs to have
  - tabs:
    - on the sides
  - notches:
    - on the bottom

## Utility/geometry code changes

- Create new functions for creating the outlines for all sides, or allow for passing flag to current functions. It may be easier and clearer to use new functions since most are just rectangles. The side outlines are more complex, but only due to the multiple dynamic row segments. We could create helper functions for creating the segments, and then altering the segments depending on the need based on the output changes noted above.

## Rendering changes

- The 3d renderer should use the new box joint outlines.
  - bottom needs to be extruded in Y direction
  - sides can remain extruded in Z direction
  - front and back will need to be extruded in X direction
  - special handling will need to be done for the top back/shelf since that needs to be angled depending on the flattenTopShelf value. This will extend to how we need to create the tabs/notches for the box joints. Currently we are just extruding that in the Z direction using the angled side outline. (maybe we can extrude in X-Y direction using angle?)
- The SVG/DXF export will just use the points from the new outlines to create the shapes
  - Need to double-check, not sure if this will require additional tooling for the drawing or not since they may be getting drawn currently just as squares.

## Export layout changes

We may want to make some additional changes to make it easier to add laser engraved designes on the shapes.

- Layout left side, front panel, right side, back panel in sequential X direction
- "attach" the back top/shelf at the matching X position as the back panel and attached to the top of the back panel in the Y direction.
- Bottom can still be separate

## Other optional changes

- We may want to change the geometry design so that the front and back panels are flat along the XY plane and sides are flat along the ZY plane, so that thinking through things is a bit saner. The 2d side view could then be altered to map the Z coordinates to X coordinates. We might want to do this before anything else.

## TODOs

- [ ] double check the "changes to output" above
- [ ] add functions to create the outlines to be used for the 3d display and svg output (instead of all the side views used currently)
- [ ] update the 3d display to extrude the new outlines instead of the side views where appropriate
- [ ] update the svg/dxf output to use the new outlines (and probably remove the current "extruded" outlines since that currently has to base the shapes on the side view plus the case width)
- [ ] Double check that we don't need to limit the box joints further from the corner due to some cases like the bottom panel where it meets the back panel, and the back panel is less wide than the bottom. (we probably do need to fix this)
