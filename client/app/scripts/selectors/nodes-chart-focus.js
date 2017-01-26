import includes from 'lodash/includes';
import { fromJS } from 'immutable';
import { createSelector } from 'reselect';
import { scaleThreshold } from 'd3-scale';

import { DETAILS_PANEL_WIDTH } from '../constants/styles';


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
const propsMarginsSelector = (_, props) => props.margins;

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

export const selectedNodeInFocus = createSelector(
  [
    layoutNodesSelector,
    layoutEdgesSelector,
    viewportCenterSelector,
    propsSelectedNodeIdSelector,
    (_, props) => props.adjacentNodes,
    stateWidthSelector,
    stateHeightSelector,
    stateScaleSelector,
  ],
  (layoutNodes, layoutEdges, viewportCenter, selectedNodeId, adjacentNodes, width, height,
    scale) => {
    if (!selectedNodeId || !layoutNodes.has(selectedNodeId)) return {};

    const adjacentLayoutNodeIds = [];
    adjacentNodes.forEach((adjacentId) => {
      // filter loopback
      if (adjacentId !== selectedNodeId) {
        adjacentLayoutNodeIds.push(adjacentId);
      }
    });

    layoutNodes = layoutNodes.mergeIn([selectedNodeId], viewportCenter);

    // circle layout for adjacent nodes
    const adjacentCount = adjacentLayoutNodeIds.length;
    const density = radiusDensity(adjacentCount);
    const radius = Math.min(width, height) / density / scale;
    const innerAngle = (2 * Math.PI) / adjacentCount;
    const offsetAngle = Math.PI / 4;

    layoutNodes = layoutNodes.map((node, nodeId) => {
      const index = adjacentLayoutNodeIds.indexOf(nodeId);
      if (index > -1) {
        const angle = offsetAngle + (index * innerAngle);
        return node.merge({
          x: viewportCenter.x + (radius * Math.sin(angle)),
          y: viewportCenter.y + (radius * Math.cos(angle))
        });
      }
      return node;
    });

    // fix all edges for circular nodes
    layoutEdges = layoutEdges.map((edge) => {
      if (edge.get('source') === selectedNodeId
        || edge.get('target') === selectedNodeId
        || includes(adjacentLayoutNodeIds, edge.get('source'))
        || includes(adjacentLayoutNodeIds, edge.get('target'))) {
        const source = layoutNodes.get(edge.get('source'));
        const target = layoutNodes.get(edge.get('target'));
        return edge.set('points', fromJS([
          {x: source.get('x'), y: source.get('y')},
          {x: target.get('x'), y: target.get('y')}
        ]));
      }
      return edge;
    });

    // auto-scale node size for selected nodes
    // const selectedNodeScale = getNodeScale(adjacentNodes.size, state.width, state.height);
    const selectedScale = 1;

    return { layoutNodes, layoutEdges, selectedScale };
  }
);
