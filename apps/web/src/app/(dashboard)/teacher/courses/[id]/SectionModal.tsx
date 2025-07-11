import { CustomFormField } from "@/components/CustomFormField";
import CustomModal from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { SectionFormData, sectionSchema } from "@/lib/schemas";
import { createId } from "@/lib/utils"; // 生成 CUID2 ID
import { addSection, closeSectionModal, editSection } from "@/state";
import { useAppDispatch, useAppSelector } from "@/state/redux";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const SectionModal = () => {
  const dispatch = useAppDispatch();
  const { isSectionModalOpen, selectedSectionIndex, sections } = useAppSelector(
    (state) => state.global.courseEditor
  );

  const section =
    selectedSectionIndex !== null ? sections[selectedSectionIndex] : null;

  const methods = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (section) {
      methods.reset({
        title: section.sectionTitle,
        description: section.sectionDescription,
      });
    } else {
      methods.reset({
        title: "",
        description: "",
      });
    }
  }, [section, methods]);

  const onClose = () => {
    dispatch(closeSectionModal());
  };

  const onSubmit = (data: SectionFormData) => {
    const newSection: Section = {
      sectionId: section?.sectionId || createId(), // 生成 CUID2 ID
      sectionTitle: data.title,
      sectionDescription: data.description,
      chapters: section?.chapters || [],
    };

    if (selectedSectionIndex === null) {
      dispatch(addSection(newSection));
    } else {
      dispatch(
        editSection({
          index: selectedSectionIndex,
          section: newSection,
        })
      );
    }

    toast.success(
      `章节添加/更新成功，但您需要保存课程才能应用更改`
    );
    onClose();
  };

  return (
    <CustomModal isOpen={isSectionModalOpen} onClose={onClose}>
      <div className="section-modal">
        <div className="section-modal__header">
          <h2 className="section-modal__title">添加/编辑章节</h2>
          <button onClick={onClose} className="section-modal__close">
            <X className="w-6 h-6" />
          </button>
        </div>

        <Form {...methods}>
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="section-modal__form"
          >
            <CustomFormField
              className="themed-input"
              name="title"
              label="章节标题"
              placeholder="在此输入章节标题"
            />

            <CustomFormField
              className="themed-input"
              name="description"
              label="章节描述"
              type="textarea"
              placeholder="在此输入章节描述"
            />

            <div className="section-modal__actions">
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" className="bg-primary-700">
                保存
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </CustomModal>
  );
};

export default SectionModal;
