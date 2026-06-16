import {
  StyledTabList,
  StyledTab,
  StyledDot,
  StyledCount,
} from "./Tabs.styles";

export interface TabItem {
  id: string;
  label: string;
  /** Optional colour dot rendered before the label. */
  color?: string;
  /** Optional count rendered after the label. */
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <StyledTabList role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <StyledTab
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={active}
            $active={active}
            $color={tab.color}
            onClick={() => onChange(tab.id)}
          >
            {tab.color ? <StyledDot $color={tab.color} /> : null}
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <StyledCount>{tab.count}</StyledCount>
            ) : null}
          </StyledTab>
        );
      })}
    </StyledTabList>
  );
}
