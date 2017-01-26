import debug from 'debug';
import { createSelector } from 'reselect';
import { Map as makeMap } from 'immutable';
import timely from 'timely';

import { EDGE_ID_SEPARATOR } from '../constants/naming';
import { doLayout } from '../charts/nodes-layout';

const log = debug('scope:nodes-chart');

const layoutNodesSelector = (state, _) => state.layoutNodes;
const layoutEdgesSelector = (state, _) => state.layoutEdges;
const stateWidthSelector = (state, _) => state.width;
const stateHeightSelector = (state, _) => state.height;
const inputNodesSelector = (_, props) => props.nodes;
const propsMarginsSelector = (_, props) => props.margins;
const forceRelayoutSelector = (_, props) => props.forceRelayout;
const topologyIdSelector = (_, props) => props.topologyId;
const topologyOptionsSelector = (_, props) => props.topologyOptions;


// Restoring the previous layout
const restoredLayoutNodesSelector = createSelector(
  [
    layoutNodesSelector,
  ],
  layoutNodes => layoutNodes.map(node => node.merge({
    x: node.get('px'),
    y: node.get('py'),
  }))
);
const restoredLayoutEdgesSelector = createSelector(
  [
    layoutEdgesSelector,
  ],
  layoutEdges => layoutEdges.map(edge =>
    (edge.has('ppoints') ? edge.set('points', edge.get('ppoints')) : edge)
  )
);
export const restoredLayout = createSelector(
  [
    restoredLayoutNodesSelector,
    restoredLayoutEdgesSelector,
  ],
  (layoutNodes, layoutEdges) => ({ layoutNodes, layoutEdges })
);


// Calculating a new layout
function initEdges(nodes) {
  let edges = makeMap();

  nodes.forEach((node, nodeId) => {
    const adjacency = node.get('adjacency');
    if (adjacency) {
      adjacency.forEach((adjacent) => {
        const edge = [nodeId, adjacent];
        const edgeId = edge.join(EDGE_ID_SEPARATOR);

        if (!edges.has(edgeId)) {
          const source = edge[0];
          const target = edge[1];
          if (nodes.has(source) && nodes.has(target)) {
            edges = edges.set(edgeId, makeMap({
              id: edgeId,
              value: 1,
              source,
              target
            }));
          }
        }
      });
    }
  });

  return edges;
}

const layoutOptionsSelector = createSelector(
  [
    stateWidthSelector,
    stateHeightSelector,
    propsMarginsSelector,
    forceRelayoutSelector,
    topologyIdSelector,
    topologyOptionsSelector,
  ],
  (width, height, margins, forceRelayout, topologyId, topologyOptions) => (
    { width, height, margins, forceRelayout, topologyId, topologyOptions }
  )
);
export const updatedLayout = createSelector(
  [
    inputNodesSelector,
    layoutOptionsSelector,
  ],
  (nodes, options) => {
    if (nodes.size === 0) {
      return {
        layoutNodes: makeMap(),
        layoutEdges: makeMap(),
      };
    }

    const edges = initEdges(nodes);
    const timedLayouter = timely(doLayout);
    const graph = timedLayouter(nodes, edges, options);
    log(`graph layout took ${timedLayouter.time}ms`);

    const layoutNodes = graph.nodes.map(node => makeMap({
      x: node.get('x'),
      y: node.get('y'),
      // extract coords and save for restore
      px: node.get('x'),
      py: node.get('y')
    }));

    const layoutEdges = graph.edges.map(edge => edge.set('ppoints', edge.get('points')));

    return { layoutNodes, layoutEdges };
  }
);
