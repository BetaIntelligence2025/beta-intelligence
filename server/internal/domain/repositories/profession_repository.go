package repositories

import (
	"github.com/PavaniTiago/beta-intelligence/internal/domain/entities"
	"gorm.io/gorm"
)

type ProfessionRepository interface {
	GetProfessions(page, limit int, orderBy string) ([]entities.Profession, int64, error)
}

type professionRepository struct {
	db *gorm.DB
}

func NewProfessionRepository(db *gorm.DB) ProfessionRepository {
	return &professionRepository{db}
}

func (r *professionRepository) GetProfessions(page, limit int, orderBy string) ([]entities.Profession, int64, error) {
	var professions []entities.Profession
	var total int64

	// Get total count
	if err := r.db.Model(&entities.Profession{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Calculate offset
	offset := (page - 1) * limit

	// Get paginated results
	query := r.db.Model(&entities.Profession{})

	if orderBy != "" {
		query = query.Order(orderBy)
	}

	result := query.Offset(offset).
		Limit(limit).
		Find(&professions)

	if result.Error != nil {
		return nil, 0, result.Error
	}

	return professions, total, nil
}
