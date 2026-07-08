import { useState } from "react";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import SettingRow from "../../../components/SettingRow/SettingRow";
import Button from "../../../primitives/Button/Button";
import CategoryManagerModal from "../../categories/CategoryManagerModal/CategoryManagerModal";
import { Tags } from "lucide-react";

export default function CategoriesCard() {
  const [isManaging, setIsManaging] = useState(false);

  return (
    <Card>
      <SectionHead label="Spending" title="Categories" />
      <SettingRow
        icon={<Tags size={18} />}
        title="Transaction categories"
        desc="Add, recolour, and organise your spending categories"
        last
      >
        <Button
          variant="secondary"
          icon="Settings2"
          onClick={() => setIsManaging(true)}
        >
          Manage categories
        </Button>
      </SettingRow>
      {isManaging && (
        <CategoryManagerModal onClose={() => setIsManaging(false)} />
      )}
    </Card>
  );
}
