package handlers

import (
	"strconv"

	"github.com/PavaniTiago/beta-intelligence/internal/application/usecases"
	"github.com/gofiber/fiber/v2"
)

type EventHandler struct {
	eventUseCase usecases.EventUseCase
}

func NewEventHandler(eventUseCase usecases.EventUseCase) *EventHandler {
	return &EventHandler{eventUseCase}
}

func (h *EventHandler) GetEvents(c *fiber.Ctx) error {
	// Get query parameters
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	orderBy := c.Query("orderBy", "event_time desc")

	events, total, err := h.eventUseCase.GetEvents(page, limit, orderBy)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": events,
		"meta": fiber.Map{
			"total":     total,
			"page":      page,
			"limit":     limit,
			"last_page": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
