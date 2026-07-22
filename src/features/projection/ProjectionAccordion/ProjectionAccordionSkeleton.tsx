import Skeleton from "../../../primitives/Skeleton/Skeleton";
import {
  StyledAccordion,
  StyledSectionHead,
  StyledSectionTitle,
  StyledLegend,
  StyledLegendDot,
  StyledColumnHeader,
  StyledYearSection,
} from "./ProjectionAccordion.styles";
import {
  StyledYearRow,
  StyledNumCell,
} from "./ProjectionAccordionSkeleton.styles";

// A screenful of collapsed years — enough to fill the card without pretending
// to know how far the projection reaches.
const YEARS = Array.from({ length: 8 }, (_, year) => year);

// Total Liquid · Restschuld · Net Cashflow · Sondertilgung
const FIGURES = [96, 104, 84, 76];

const ROW_HEIGHT = 15;

/**
 * Placeholder for the Projection Accordion. Its header, legend and column
 * labels are chrome the projection does not decide, so they render for real;
 * only the year rows stand in, on the same grid the real headers use, so the
 * card does not resize when the snapshots land.
 */
export default function ProjectionAccordionSkeleton() {
  return (
    <StyledAccordion data-testid="projection-accordion-skeleton">
      <StyledSectionHead>
        <StyledSectionTitle>Projection Accordion</StyledSectionTitle>
        <StyledLegend>
          <StyledLegendDot />
          Payoff year highlighted
        </StyledLegend>
      </StyledSectionHead>

      <StyledColumnHeader>
        <span />
        <span>Period</span>
        <span>Total Liquid</span>
        <span>Restschuld</span>
        <span>Net Cashflow</span>
        <span>Sondertilgung</span>
      </StyledColumnHeader>

      {YEARS.map((year) => (
        <StyledYearSection key={year}>
          <StyledYearRow aria-hidden="true">
            <Skeleton width={17} height={17} />
            <Skeleton width={44} height={ROW_HEIGHT} />
            {FIGURES.map((width) => (
              <StyledNumCell key={width}>
                <Skeleton width={width} height={ROW_HEIGHT} />
              </StyledNumCell>
            ))}
          </StyledYearRow>
        </StyledYearSection>
      ))}
    </StyledAccordion>
  );
}
