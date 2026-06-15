import type { AccountWithBalance } from "../../../types/account";
import { resolveAccountColor } from "../../../utils/color/color";
import Modal from "../../../components/Modal/Modal";
import Button from "../../../primitives/Button/Button";
import Money from "../../../primitives/Money/Money";
import type { ImportedStatement } from "../importTypes";
import {
  StyledPreview,
  StyledMeta,
  StyledFileName,
  StyledAccountBadge,
  StyledCount,
  StyledTable,
  StyledRow,
  StyledDate,
  StyledDesc,
  StyledCategory,
  StyledAmount,
} from "./ImportPreview.styles";

interface Props {
  statement: ImportedStatement;
  account: AccountWithBalance | undefined;
  onClose: () => void;
}

export default function ImportPreview({ statement, account, onClose }: Props) {
  const color = account ? resolveAccountColor(account) : "#909AAE";

  return (
    <Modal
      title="Imported transactions"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <StyledPreview>
        <StyledMeta>
          <StyledFileName>{statement.filename}</StyledFileName>
          <StyledAccountBadge $color={color}>
            {account?.name ?? "Account"}
          </StyledAccountBadge>
          <StyledCount>
            {statement.count} transactions · showing {statement.txns.length}
          </StyledCount>
        </StyledMeta>
        <StyledTable>
          {statement.txns.map((t, i) => (
            <StyledRow key={t.id} $alt={i % 2 === 1}>
              <StyledDate>{t.date.slice(5)}</StyledDate>
              <StyledDesc>{t.desc}</StyledDesc>
              <StyledCategory>{t.cat}</StyledCategory>
              <StyledAmount>
                <Money cents={t.amount} sign />
              </StyledAmount>
            </StyledRow>
          ))}
        </StyledTable>
      </StyledPreview>
    </Modal>
  );
}
