package repositories

import (
	"github.com/PavaniTiago/beta-intelligence/internal/domain/entities"
	"gorm.io/gorm"
)

type EventRepository interface {
	GetEvents(page, limit int, orderBy string) ([]entities.Event, int64, error)
}

type eventRepository struct {
	db *gorm.DB
}

func NewEventRepository(db *gorm.DB) EventRepository {
	return &eventRepository{db}
}

func (r *eventRepository) GetEvents(page, limit int, orderBy string) ([]entities.Event, int64, error) {
	var events []entities.Event
	var total int64

	// Get total count
	if err := r.db.Model(&entities.Event{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Calculate offset
	offset := (page - 1) * limit

	// Get paginated results with User relation
	query := r.db.Model(&entities.Event{}).
		Select("events.*, users.*").
		Joins("LEFT JOIN users ON events.user_id = users.user_id").
		Preload("User")

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
