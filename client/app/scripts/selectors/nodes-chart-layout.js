import debug from 'debug';
import { createSelector } from 'reselect';
import { Map as makeMap } from 'immutable';
import timely from 'timely';

import { EDGE_ID_SEPARATOR } from '../constants/naming';
import { doLayout } from '../charts/nodes-layout';

const log = debug('scope:nodes-chart');


// Restoring the previous layout
const restoredNodesSelector = createSelector(
  [
    (state, _) => state.nodes,
  ],
  nodes => nodes.map(node => node.merge({
    x: node.get('px'),
    y: node.get('py'),
  }))
);
const restoredEdgesSelector = createSelector(
  [
    (state, _) => state.edges,
  ],
  edges => edges.map(edge =>
    (edge.has('ppoints') ? edge.set('points', edge.get('ppoints')) : edge)
  )
);
export const restoredLayout = createSelector(
  [
    restoredNodesSelector,
    restoredEdgesSelector,
  ],
  (nodes, edges) => ({ nodes, edges })
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

const layoutOptionsSelector = (state, props) => ({
  width: state.width,
  height: state.height,
  margins: props.margins,
  forceRelayout: props.forceRelayout,
  topologyId: props.topologyId,
  topologyOptions: props.topologyOptions,
});

export const updatedLayout = createSelector(
  [
    (_, props) => props.nodes,
    layoutOptionsSelector,
  ],
  (nodes, options) => {
    if (nodes.size === 0) {
      return {
        nodes: makeMap(),
        edges: makeMap(),
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

    return {
      nodes: layoutNodes,
      edges: layoutEdges,
    };
  }
);
