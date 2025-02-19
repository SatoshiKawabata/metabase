import styled from "styled-components";

import ActionMenu from "metabase/collections/components/ActionMenu";
import Card from "metabase/components/Card";
import { color } from "metabase/lib/colors";

const HEIGHT = 250;

export const HoverMenu = styled(ActionMenu)`
  visibility: hidden;
  color: ${color("text-medium")};

  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 3;
`;

export const VizCard = styled(Card)`
  padding: 0.5rem 0;
  position: relative;
  line-height: inherit;
  height: ${HEIGHT}px;

  &:hover {
    ${HoverMenu} {
      visibility: visible;
    }
  }
`;
