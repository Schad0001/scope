import { includes, without } from 'lodash';
import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import { scaleThreshold } from 'd3-scale';

import { NODE_BASE_SIZE, DETAILS_PANEL_WIDTH } from '../constants/styles';


const circularOffsetAngle = Math.PI / 4;
// make sure circular layouts a bit denser with 3-6 nodes
const radiusDensity = scaleThreshold()
  .domain([3, 6])
  .range([2.5, 3.5, 3]);


const layoutNodesSelector = (state, _) => state.layoutNodes;
const layoutEdgesSelector = (state, _) => state.layoutEdges;
const stateWidthSelector = (state, _) => state.width;
const stateHeightSelector = (state, _) => state.height;
const stateScaleSelector = (state, _) => state.scale;
const stateTranslateXSelector = (state, _) => state.panTranslateX;
const stateTranslateYSelector = (state, _) => state.panTranslateY;
const propsSelectedNodeIdSelector = (_, props) => props.selectedNodeId;
const propsAdjacentNodesSelector = (_, props) => props.adjacentNodes;
const propsMarginsSelector = (_, props) => props.margins;

// The narrower dimension of the viewport, used for scaling.
const viewportExpanseSelector = createSelector(
  [
    stateWidthSelector,
    stateHeightSelector,
  ],
  (width, height) => Math.min(width, height)
);

// Coordinates of the viewport center (when the details
// panel is open), used for focusing the selected node.
const viewportCenterSelector = createSelector(
  [
    stateWidthSelector,
    stateHeightSelector,
    stateTranslateXSelector,
    stateTranslateYSelector,
    stateScaleSelector,
    propsMarginsSelector,
  ],
  (width, height, translateX, translateY, scale, margins) => {
    const viewportHalfWidth = ((width + margins.left) - DETAILS_PANEL_WIDTH) / 2;
    const viewportHalfHeight = (height + margins.top) / 2;
    return {
      x: (-translateX + viewportHalfWidth) / scale,
      y: (-translateY + viewportHalfHeight) / scale,
    };
  }
);

// List of all the adjacent nodes to the selected
// one, excluding itself (in case of loops).
const selectedNodeNeighborsIdsSelector = createSelector(
  [
    propsSelectedNodeIdSelector,
    propsAdjacentNodesSelector,
  ],
  (selectedNodeId, adjacentNodes) => without(adjacentNodes.toArray(), selectedNodeId)
);

const selectedNodesLayoutSettingsSelector = createSelector(
  [
    selectedNodeNeighborsIdsSelector,
    viewportExpanseSelector,
    stateScaleSelector,
  ],
  (circularNodesIds, viewportExpanse, scale) => {
    const circularNodesCount = circularNodesIds.length;
    const maxMagnified = viewportExpanse / NODE_BASE_SIZE / 3;
    const shrinkFactor = Math.sqrt(circularNodesCount + 10);

    return {
      selectedScale: maxMagnified / shrinkFactor / scale,
      circularRadius: viewportExpanse / radiusDensity(circularNodesCount) / scale,
      circularInnerAngle: (2 * Math.PI) / circularNodesCount,
    };
  }
);

export const selectedNodeInFocus = createSelector(
  [
    layoutNodesSelector,
    layoutEdgesSelector,
    viewportCenterSelector,
    propsSelectedNodeIdSelector,
    selectedNodeNeighborsIdsSelector,
    selectedNodesLayoutSettingsSelector,
  ],
  (layoutNodes, layoutEdges, viewportCenter, selectedNodeId, neighborsIds, layoutSettings) => {
    // Do nothing if there is no selected node or the selected node is not there anymore.
    if (!selectedNodeId || !layoutNodes.has(selectedNodeId)) {
      return {};
    }

    const { selectedScale, circularRadius, circularInnerAngle } = layoutSettings;

    // fix the selected node in the viewport center
    layoutNodes = layoutNodes.mergeIn([selectedNodeId], viewportCenter);

    // circular layout for adjacent nodes
    layoutNodes = layoutNodes.map((node, nodeId) => {
      const index = neighborsIds.indexOf(nodeId);
      if (index > -1) {
        const angle = circularOffsetAngle + (index * circularInnerAngle);
        return node.merge({
          x: viewportCenter.x + (circularRadius * Math.sin(angle)),
          y: viewportCenter.y + (circularRadius * Math.cos(angle))
        });
      }
      return node;
    });

    // fix all edges for circular nodes
    layoutEdges = layoutEdges.map((edge) => {
      if (edge.get('source') === selectedNodeId
        || edge.get('target') === selectedNodeId
        || includes(neighborsIds, edge.get('source'))
        || includes(neighborsIds, edge.get('target'))) {
        const source = layoutNodes.get(edge.get('source'));
        const target = layoutNodes.get(edge.get('target'));
        return edge.set('points', fromJS([
          {x: source.get('x'), y: source.get('y')},
          {x: target.get('x'), y: target.get('y')}
        ]));
      }
      return edge;
    });

    return { layoutNodes, layoutEdges, selectedScale };
  }
);
