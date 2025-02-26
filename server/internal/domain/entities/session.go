package entities

import "github.com/google/uuid"

type Session struct {
	ID          uuid.UUID `json:"session_id" gorm:"type:uuid;primary_key;column:session_id"`
	UtmSource   string    `json:"utm_source" gorm:"column:utm_source"`
	UtmMedium   string    `json:"utm_medium" gorm:"column:utm_medium"`
	UtmCampaign string    `json:"utm_campaign" gorm:"column:utm_campaign"`
	UtmContent  string    `json:"utm_content" gorm:"column:utm_content"`
	UtmTerm     string    `json:"utm_term" gorm:"column:utm_term"`
	Country     string    `json:"country" gorm:"column:country"`
	State       string    `json:"state" gorm:"column:state"`
	City        string    `json:"city" gorm:"column:city"`
}
