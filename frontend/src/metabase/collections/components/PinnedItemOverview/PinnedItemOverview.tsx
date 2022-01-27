import React, { useMemo } from "react";
import _ from "underscore";
import { t } from "ttag";

import Metadata from "metabase-lib/lib/metadata/Metadata";
import PinnedItemCard from "metabase/collections/components/PinnedItemCard";
import CollectionCardVisualization from "metabase/collections/components/CollectionCardVisualization";
import EmptyPinnedItemsBanner from "../EmptyPinnedItemsBanner/EmptyPinnedItemsBanner";
import PinnedItemSortDropTarget from "metabase/collections/components/PinnedItemSortDropTarget";
import { Item, Collection, isRootCollection } from "metabase/collections/utils";
import ItemDragSource from "metabase/containers/dnd/ItemDragSource";

import { Container, Grid, SectionHeader } from "./PinnedItemOverview.styled";

type Props = {
  items: Item[];
  collection: Collection;
  metadata: Metadata;
  onCopy: (items: Item[]) => void;
  onMove: (items: Item[]) => void;
};

function PinnedItemOverview({
  items,
  collection,
  metadata,
  onCopy,
  onMove,
}: Props) {
  const sortedItems = _.sortBy(items, item => item.collection_position);
  const {
    card: cardItems = [],
    dashboard: dashboardItems = [],
    dataset: dataModelItems = [],
  } = _.groupBy(sortedItems, "model");

  return items.length === 0 ? (
    <Container>
      <EmptyPinnedItemsBanner />
    </Container>
  ) : (
    <Container data-testid="pinned-items">
      {cardItems.length > 0 && (
        <Grid>
          {cardItems.map(item => (
            <div key={item.id} className="relative">
              <PinnedItemSortDropTarget
                isFrontTarget
                itemModel="card"
                pinIndex={item.collection_position}
                enableDropTargetBackground={false}
              />
              <ItemDragSource item={item} collection={collection}>
                <div>
                  <CollectionCardVisualization
                    item={item}
                    collection={collection}
                    metadata={metadata}
                    onCopy={onCopy}
                    onMove={onMove}
                  />
                </div>
              </ItemDragSource>
              <PinnedItemSortDropTarget
                isBackTarget
                itemModel="card"
                pinIndex={item.collection_position}
                enableDropTargetBackground={false}
              />
            </div>
          ))}
        </Grid>
      )}

      {dashboardItems.length > 0 && (
        <Grid>
          {dashboardItems.map(item => (
            <div key={item.id} className="relative">
              <PinnedItemSortDropTarget
                isFrontTarget
                itemModel="dashboard"
                pinIndex={item.collection_position}
                enableDropTargetBackground={false}
              />
              <ItemDragSource item={item} collection={collection}>
                <div>
                  <PinnedItemCard
                    item={item}
                    collection={collection}
                    onCopy={onCopy}
                    onMove={onMove}
                  />
                </div>
              </ItemDragSource>
              <PinnedItemSortDropTarget
                isBackTarget
                itemModel="dashboard"
                pinIndex={item.collection_position}
                enableDropTargetBackground={false}
              />
            </div>
          ))}
        </Grid>
      )}

      {dataModelItems.length > 0 && (
        <div>
          <SectionHeader>
            <h4>{t`Useful data`}</h4>
            <div>
              {isRootCollection(collection)
                ? t`Start new explorations here`
                : t`Start new explorations about ${collection.name} here`}
            </div>
          </SectionHeader>
          <Grid>
            {dataModelItems.map(item => (
              <div key={item.id} className="relative">
                <PinnedItemSortDropTarget
                  isFrontTarget
                  itemModel="dataset"
                  pinIndex={item.collection_position}
                  enableDropTargetBackground={false}
                />
                <ItemDragSource item={item} collection={collection}>
                  <div>
                    <PinnedItemCard
                      item={item}
                      collection={collection}
                      onCopy={onCopy}
                      onMove={onMove}
                    />
                  </div>
                </ItemDragSource>
                <PinnedItemSortDropTarget
                  isBackTarget
                  itemModel="dataset"
                  pinIndex={item.collection_position}
                  enableDropTargetBackground={false}
                />
              </div>
            ))}
          </Grid>
        </div>
      )}
    </Container>
  );
}

export default PinnedItemOverview;
