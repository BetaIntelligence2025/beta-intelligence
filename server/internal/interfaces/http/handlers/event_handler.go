package handlers

import (
	"strconv"
	"time"

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

	// Get sort parameters
	sortBy := c.Query("sortBy", "event_time")
	sortDirection := c.Query("sortDirection", "desc")

	// Get profession filter
	var professionID *int
	if profIDStr := c.Query("profession_id"); profIDStr != "" {
		if profID, err := strconv.Atoi(profIDStr); err == nil {
			professionID = &profID
		}
	}

	// Get funnel filter
	var funnelID *int
	if funnelIDStr := c.Query("funnel_id"); funnelIDStr != "" {
		if fID, err := strconv.Atoi(funnelIDStr); err == nil {
			funnelID = &fID
		}
	}

	// Validate sort direction
	if sortDirection != "asc" && sortDirection != "desc" {
		sortDirection = "desc"
	}

	// Validate sortBy field and build orderBy
	validSortFields := map[string]string{
		// Event fields
		"event_id":     "events.event_id",
		"event_name":   "events.event_name",
		"pageview_id":  "events.pageview_id",
		"session_id":   "events.session_id",
		"event_time":   "events.event_time",
		"event_source": "events.event_source",
		"event_type":   "events.event_type",

		// User fields
		"fullname":  "users.fullname",
		"email":     "users.email",
		"phone":     "users.phone",
		"is_client": "users.isClient",

		// Session fields
		"utm_source":   "sessions.utm_source",
		"utm_medium":   "sessions.utm_medium",
		"utm_campaign": "sessions.utm_campaign",
		"utm_content":  "sessions.utm_content",
		"utm_term":     "sessions.utm_term",
		"country":      "sessions.country",
		"state":        "sessions.state",
		"city":         "sessions.city",

		// Profession fields
		"profession_name": "professions.profession_name",
		"meta_pixel":      "professions.meta_pixel",
		"meta_token":      "professions.meta_token",

		// Product fields
		"product_name": "products.product_name",

		// Funnel fields
		"funnel_name": "funnels.funnel_name",
		"funnel_tag":  "funnels.funnel_tag",
		"global":      "funnels.global",
	}

	orderBy := "events.event_time desc" // default ordering
	if field, ok := validSortFields[sortBy]; ok {
		orderBy = field + " " + sortDirection
	}

	// Parse date parameters
	from := c.Query("from", "")
	to := c.Query("to", "")

	var fromTime, toTime time.Time
	var err error

	if from != "" {
		fromTime, err = time.Parse("2006-01-02", from)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid from date format. Use YYYY-MM-DD",
			})
		}
	} else {
		// If no from date, use 30 days ago as default
		fromTime = time.Now().AddDate(0, 0, -30)
	}

	if to != "" {
		toTime, err = time.Parse("2006-01-02", to)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid to date format. Use YYYY-MM-DD",
			})
		}
		// Set to end of day
		toTime = toTime.Add(24 * time.Hour).Add(-time.Second)
	} else {
		// If no to date, use current time
		toTime = time.Now()
	}

	events, total, err := h.eventUseCase.GetEvents(page, limit, orderBy, fromTime, toTime, professionID, funnelID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": events,
		"meta": fiber.Map{
			"total":             total,
			"page":              page,
			"limit":             limit,
			"last_page":         (total + int64(limit) - 1) / int64(limit),
			"from":              fromTime.Format("2006-01-02"),
			"to":                toTime.Format("2006-01-02"),
			"sort_by":           sortBy,
			"sort_direction":    sortDirection,
			"profession_id":     professionID,
			"funnel_id":         funnelID,
			"valid_sort_fields": getKeys(validSortFields),
		},
	})
}

// Helper function to get map keys
func getKeys(m map[string]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
