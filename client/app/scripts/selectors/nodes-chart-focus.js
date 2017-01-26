import includes from 'lodash/includes';
import { fromJS } from 'immutable';
import { scaleThreshold } from 'd3-scale';

import { DETAILS_PANEL_WIDTH } from '../constants/styles';


// make sure circular layouts a bit denser with 3-6 nodes
const radiusDensity = scaleThreshold()
  .domain([3, 6])
  .range([2.5, 3.5, 3]);

export function selectedNodeInFocus(props, state) {
  let stateNodes = state.nodes;
  let stateEdges = state.edges;
  if (!stateNodes.has(props.selectedNodeId)) {
    return {};
  }

  const adjacentNodes = props.adjacentNodes;
  const adjacentLayoutNodeIds = [];

  adjacentNodes.forEach((adjacentId) => {
    // filter loopback
    if (adjacentId !== props.selectedNodeId) {
      adjacentLayoutNodeIds.push(adjacentId);
    }
  });

  // move origin node to center of viewport
  const zoomScale = state.scale;
  const translate = [state.panTranslateX, state.panTranslateY];
  const viewportHalfWidth = ((state.width + props.margins.left) - DETAILS_PANEL_WIDTH) / 2;
  const viewportHalfHeight = (state.height + props.margins.top) / 2;
  const centerX = (-translate[0] + viewportHalfWidth) / zoomScale;
  const centerY = (-translate[1] + viewportHalfHeight) / zoomScale;
  stateNodes = stateNodes.mergeIn([props.selectedNodeId], {
    x: centerX,
    y: centerY
  });

  // circle layout for adjacent nodes
  const adjacentCount = adjacentLayoutNodeIds.length;
  const density = radiusDensity(adjacentCount);
  const radius = Math.min(state.width, state.height) / density / zoomScale;
  const offsetAngle = Math.PI / 4;

  stateNodes = stateNodes.map((node, nodeId) => {
    const index = adjacentLayoutNodeIds.indexOf(nodeId);
    if (index > -1) {
      const angle = offsetAngle + ((Math.PI * 2 * index) / adjacentCount);
      return node.merge({
        x: centerX + (radius * Math.sin(angle)),
        y: centerY + (radius * Math.cos(angle))
      });
    }
    return node;
  });

  // fix all edges for circular nodes
  stateEdges = stateEdges.map((edge) => {
    if (edge.get('source') === props.selectedNodeId
      || edge.get('target') === props.selectedNodeId
      || includes(adjacentLayoutNodeIds, edge.get('source'))
      || includes(adjacentLayoutNodeIds, edge.get('target'))) {
      const source = stateNodes.get(edge.get('source'));
      const target = stateNodes.get(edge.get('target'));
      return edge.set('points', fromJS([
        {x: source.get('x'), y: source.get('y')},
        {x: target.get('x'), y: target.get('y')}
      ]));
    }
    return edge;
  });

  // auto-scale node size for selected nodes
  // const selectedNodeScale = getNodeScale(adjacentNodes.size, state.width, state.height);

  return {
    selectedScale: 1,
    edges: stateEdges,
    nodes: stateNodes
  };
}
