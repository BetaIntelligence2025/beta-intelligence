package repositories

import (
	"time"

	"github.com/PavaniTiago/beta-intelligence/internal/domain/entities"
	"gorm.io/gorm"
)

type EventRepository interface {
	GetEvents(page, limit int, orderBy string, from, to time.Time, professionID, funnelID *int) ([]entities.Event, int64, error)
}

type eventRepository struct {
	db *gorm.DB
}

func NewEventRepository(db *gorm.DB) EventRepository {
	return &eventRepository{db}
}

func (r *eventRepository) GetEvents(page, limit int, orderBy string, from, to time.Time, professionID, funnelID *int) ([]entities.Event, int64, error) {
	var events []entities.Event
	var total int64

	// Base query with all filters
	baseQuery := r.db.Model(&entities.Event{}).
		Where("event_time >= ? AND event_time <= ?", from, to)

	// Add profession filter if provided
	if professionID != nil {
		baseQuery = baseQuery.Where("events.profession_id = ?", *professionID)
	}

	// Add funnel filter if provided
	if funnelID != nil {
		baseQuery = baseQuery.Where("events.funnel_id = ?", *funnelID)
	}

	// Get total count AFTER applying all filters
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Calculate offset for pagination
	offset := (page - 1) * limit

	// Get paginated results with all relations
	query := baseQuery.
		Select(`
			events.*,
			users.*,
			sessions.*,
			professions.profession_name,
			professions.meta_pixel,
			professions.meta_token,
			products.product_name,
			funnels.funnel_name,
			funnels.funnel_tag,
			funnels.global
		`).
		Joins("LEFT JOIN users ON events.user_id = users.user_id").
		Joins("LEFT JOIN sessions ON events.session_id = sessions.session_id").
		Joins("LEFT JOIN professions ON events.profession_id = professions.profession_id").
		Joins("LEFT JOIN products ON events.product_id = products.product_id").
		Joins("LEFT JOIN funnels ON events.funnel_id = funnels.funnel_id").
		Preload("User").
		Preload("Session").
		Preload("Profession").
		Preload("Product").
		Preload("Funnel")

	if orderBy != "" {
		query = query.Order(orderBy)
	}

	result := query.Offset(offset).
		Limit(limit).
		Find(&events)

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return events, total, nil
}
