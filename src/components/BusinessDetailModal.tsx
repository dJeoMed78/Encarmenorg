import React from "react";
import { Business } from "./BusinessCard";
import { BusinessPublicDetail } from "./BusinessPublicDetail";
interface BusinessDetailModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (() => void) | ((b: Business) => void);
  onDelete?: () => void;
  onDeleteBusiness?: (b: Business) => void;
  onEdit?: (business: Business) => void;
  onEditBusiness?: (b: Business) => void;
  onToggleTop?: ((id: string | number) => void) | ((b: Business) => void);
  onToggleRecommended?:
    ((id: string | number) => void) | ((b: Business) => void);
  isAdmin?: boolean;
  onAdminClick?: () => void;
  activePromotion?: any;
  onOpenClaimCouponModal?: (p: any) => void;
  onOpenDigitalCard?: (b: Business) => void;
  onOpenClientPage?: (b: Business) => void;
}
export function BusinessDetailModal(props: BusinessDetailModalProps) {
  if (!props.isOpen || !props.business) return null;
  return (
    <BusinessPublicDetail
      key={props.business.id}
      business={props.business}
      modal
      onBack={props.onClose}
      isFavorite={props.isFavorite}
      onToggleFavorite={
        props.onToggleFavorite
          ? () =>
              (props.onToggleFavorite as (b: Business) => void)(props.business!)
          : undefined
      }
      onAdminClick={props.onAdminClick}
      onEditBusiness={props.onEditBusiness || props.onEdit}
      onOpenDigitalCard={props.onOpenDigitalCard}
      onOpenClientPage={props.onOpenClientPage}
      activePromotion={props.activePromotion}
      onOpenPromotion={props.onOpenClaimCouponModal}
    />
  );
}
